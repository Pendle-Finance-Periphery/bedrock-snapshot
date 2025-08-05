import { AsyncNedb } from 'nedb-async';
import {
  getPendleYieldTokenContractOnContext,
  PendleYieldTokenContext,
  RedeemInterestEvent,
  TransferEvent,
  BurnEvent
} from '../types/eth/pendleyieldtoken.js';
import { MISC_CONSTS, PENDLE_POOL_ADDRESSES } from '../consts.js';
import { getUnixTimestamp, isPendleAddress } from '../helper.js';
import { readAllUserERC20Balances, readAllYTPositions } from '../multicall.js';
import { EVENT_USER_SHARE, POINT_SOURCE_YT } from '../types.js';
import { EthContext } from '@sentio/sdk/eth';
import { AccountSnapshot, UserShareEvent, Label } from '../schema/schema.js';
import { convertIdToUser, convertUserToId } from './helper.js';

// const db = new AsyncNedb({
//   filename: '/data/pendle-accounts-yt.db',
//   autoload: true,
// });

// db.persistence.setAutocompactionInterval(60 * 1000);

// type AccountSnapshot = {
//   _id: string;
//   lastUpdatedAt: number;
//   lastImpliedHolding: string;
// };

export async function handleYTBurn(evt: BurnEvent, ctx: PendleYieldTokenContext) {
  await processAllYTAccounts(ctx, evt.index, []);
}

export async function handleYTTransfer(evt: TransferEvent, ctx: PendleYieldTokenContext) {
  await processAllYTAccounts(ctx, evt.index, [evt.args.from.toLowerCase(), evt.args.to.toLowerCase()]);
}

export async function handleYTRedeemInterest(evt: RedeemInterestEvent, ctx: PendleYieldTokenContext) {
  await processAllYTAccounts(ctx, evt.index, [evt.args.user.toLowerCase()]);
}

export async function processAllYTAccounts(
  ctx: EthContext,
  logIndex: number,
  addressesToAdd: string[] = [],
) {
  const contract = getPendleYieldTokenContractOnContext(ctx, PENDLE_POOL_ADDRESSES.YT);
  const timestamp = getUnixTimestamp(ctx.timestamp);
  
  if (await contract.isExpired()) {
    const reserve = await contract.syReserve();
    const allAddresses = (await ctx.store.list(AccountSnapshot)).map(s => convertIdToUser(s.id)).filter((u) => u.label == Label.YT).map((u) => u.addr)
    if (allAddresses.length != 0) {
      for(let a of allAddresses) {
        await updateAccount(ctx, logIndex, a, 0n, timestamp);
      }
      await ctx.store.delete(AccountSnapshot, allAddresses.map((a) => convertUserToId(Label.YT, a)))
    }
    await updateAccount(ctx, logIndex, PENDLE_POOL_ADDRESSES.TREASURY, reserve, timestamp);
    return;
  }

  const allYTBalances = await readAllUserERC20Balances(ctx, addressesToAdd, contract.address);
  const allYTPositions = await readAllYTPositions(ctx, addressesToAdd);

  for (let i = 0; i < addressesToAdd.length; i++) {
    const address = addressesToAdd[i];
    const balance = allYTBalances[i];
    const interestData = allYTPositions[i];
    if (interestData.lastPYIndex == 0n) continue;

    const impliedHolding = (balance * MISC_CONSTS.ONE_E18) / interestData.lastPYIndex + interestData.accruedInterest;
    const fee = (impliedHolding * 5n) / 100n;
    await updateAccount(ctx, logIndex, address, impliedHolding - fee, timestamp);
  }

  const supply = await contract.totalSupply();
  const index = await contract.pyIndexStored();
  const totalFee = supply * MISC_CONSTS.ONE_E18 / index * 3n / 100n;
  await updateAccount(ctx, logIndex, PENDLE_POOL_ADDRESSES.TREASURY, totalFee, timestamp);
}


async function updateAccount(ctx: EthContext, logIndex: number, account: string, impliedSy: bigint, timestamp: number) {
  const accSnapshot = new AccountSnapshot({
    id: convertUserToId(Label.YT, account),
    lastUpdated: timestamp,
    lastImpliedHolding: impliedSy,
  })
  await ctx.store.upsert(accSnapshot)

  const shareEvent = new UserShareEvent({
    id: `${ctx.blockNumber}-${logIndex}-${Label.YT}-${account}`,
    label: Label.YT,
    account,
    share: impliedSy,
    timestamp: timestamp,
    blockNumber: ctx.blockNumber,
    log_index: logIndex
  })
  await ctx.store.upsert(shareEvent);
}
