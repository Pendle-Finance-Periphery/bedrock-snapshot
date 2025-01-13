import { AsyncNedb } from 'nedb-async';
import {
  PendleMarketContext,
  RedeemRewardsEvent,
  SwapEvent,
  TransferEvent,
  getPendleMarketContractOnContext,
} from '../types/eth/pendlemarket.js';
import { getUnixTimestamp, isLiquidLockerAddress, isSentioInternalError } from '../helper.js';
import { MISC_CONSTS, PENDLE_POOL_ADDRESSES } from '../consts.js';
import { getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20';
import { EthContext } from '@sentio/sdk/eth';
import { getMulticallContractOnContext } from '../types/eth/multicall.js';
import { readAllUserActiveBalances, readAllUserERC20Balances } from '../multicall.js';
import { EVENT_USER_SHARE, POINT_SOURCE_LP } from '../types.js';

import { AccountSnapshot, UserShareEvent, Label } from '../schema/schema.js';
import { convertIdToUser, convertUserToId } from './helper.js';

/**
 * @dev 1 LP = (X PT + Y SY) where X and Y are defined by market conditions
 * So same as Balancer LPT, we need to update all positions on every swap
 *
 * Users can further deposit LP to liquid lockers to get back receipt tokens.
 * This should also be handled here.
 *
 * Currently for all liquid lockers, 1 receipt token = 1 LP
 */

// const db = new AsyncNedb({
//   filename: '/data/pendle-accounts-lp.db',
//   autoload: true,
// });

// db.persistence.setAutocompactionInterval(60 * 1000);

// type AccountSnapshot = {
//   _id: string;
//   lastUpdatedAt: number;
//   lastImpliedHolding: string;
// };

export async function handleLPTransfer(evt: TransferEvent, ctx: PendleMarketContext) {
  await processAllLPAccounts(ctx, evt.index, [evt.args.from.toLowerCase(), evt.args.to.toLowerCase()]);
}

export async function handleMarketRedeemReward(evt: RedeemRewardsEvent, ctx: PendleMarketContext) {
  await processAllLPAccounts(ctx, evt.index);
}

export async function handleMarketSwap(evt: SwapEvent, ctx: PendleMarketContext) {
  await processAllLPAccounts(ctx, evt.index);
}

export async function processAllLPAccounts(ctx: EthContext, logIndex: number, addressesToAdd: string[] = []) {
  // might not need to do this on interval since we are doing it on every swap
  // const allAddresses = (await db.asyncFind<AccountSnapshot>({})).map((snapshot) => snapshot._id);

  const allAddresses = (await ctx.store.list(AccountSnapshot))
    .map((snapshot) => convertIdToUser(snapshot.id))
    .filter((u) => u.label == Label.LP)
    .map((u) => u.addr);

  for (let address of addressesToAdd) {
    address = address.toLowerCase();
    if (!allAddresses.includes(address) && !isLiquidLockerAddress(address)) {
      allAddresses.push(address);
    }
  }

  const result: Record<string, bigint> = {};
  for (let lpToken of PENDLE_POOL_ADDRESSES.LP) {
    if (ctx.blockNumber < lpToken.deployedBlock) continue;
    const marketContract = getPendleMarketContractOnContext(ctx, lpToken.address);

    const [allUserShares, totalShare, state] = await Promise.all([
      readAllUserActiveBalances(ctx, lpToken.address, allAddresses),
      marketContract.totalActiveSupply(),
      marketContract.readState(marketContract.address),
    ]);

    for (const liquidLocker of PENDLE_POOL_ADDRESSES.LIQUID_LOCKERS) {
      if (liquidLocker.lpToken != lpToken.address) continue;
      const liquidLockerBal = await marketContract.balanceOf(liquidLocker.address);
      if (liquidLockerBal == 0n) continue;

      const liquidLockerActiveBal = await marketContract.activeBalance(liquidLocker.address);
      try {
        const allUserReceiptTokenBalances = await readAllUserERC20Balances(
          ctx,
          allAddresses,
          liquidLocker.receiptToken
        );
        for (let i = 0; i < allAddresses.length; i++) {
          const userBal = allUserReceiptTokenBalances[i];
          const userBoostedHolding = (userBal * liquidLockerActiveBal) / liquidLockerBal;
          allUserShares[i] += userBoostedHolding;
        }
      } catch (err) {
        if (isSentioInternalError(err)) {
          throw err;
        }
      }
    }

    for (let i = 0; i < allAddresses.length; i++) {
      const account = allAddresses[i];
      const impliedSy = (allUserShares[i] * state.totalSy) / totalShare;
      // await updateAccount(ctx, account, impliedSy, timestamp);
      result[account] = result[account] ? result[account] + impliedSy : impliedSy;
    }
  }

  const timestamp = getUnixTimestamp(ctx.timestamp);
  for (let account in result) {
    await updateAccount(ctx, logIndex, account, result[account], timestamp);
  }
}

async function updateAccount(ctx: EthContext, logIndex: number, account: string, impliedSy: bigint, timestamp: number) {
  const accSnapshot = new AccountSnapshot({
    id: convertUserToId(Label.LP, account),
    lastUpdated: timestamp,
    lastImpliedHolding: impliedSy,
  })
  await ctx.store.upsert(accSnapshot)

  const shareEvent = new UserShareEvent({
    id: `${ctx.blockNumber}-${logIndex}-${Label.LP}-${account}`,
    label: Label.LP,
    account,
    share: impliedSy,
    timestamp: timestamp,
    blockNumber: ctx.blockNumber,
    log_index: logIndex
  })
  await ctx.store.upsert(shareEvent);
}
