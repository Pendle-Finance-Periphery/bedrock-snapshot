import { EthContext } from '@sentio/sdk/eth';
import { MISC_CONSTS, PENDLE_POOL_ADDRESSES } from '../consts.js';
import { EVENT_POINT_INCREASE, POINT_SOURCE, POINT_SOURCE_YT } from '../types.js';

/**
 *
 * @param amountYieldTokenHolding amount of yield token user holds during the period
 * @param holdingPeriod amount of time user holds the yield token
 * @returns time-weighted holding points
 *
 *
 * @dev to be decided by deployer...
 */
function calcPointsFromHolding(amountYieldTokenHolding: bigint, holdingPeriod: bigint): bigint {
  return (amountYieldTokenHolding * holdingPeriod) / 3600n;
}

export function updatePoints(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  amountYieldTokenHolding: bigint,
  holdingPeriod: bigint,
  updatedAt: number
) {
  const point = calcPointsFromHolding(amountYieldTokenHolding, holdingPeriod);

  if (label == POINT_SOURCE_YT) {
    const pointTreasuryFee = calcTreasuryFee(point);
    increasePoint(ctx, label, account, amountYieldTokenHolding, holdingPeriod, point - pointTreasuryFee, updatedAt);
    increasePoint(ctx, label, PENDLE_POOL_ADDRESSES.TREASURY, 0n, holdingPeriod, pointTreasuryFee, updatedAt);
  } else {
    increasePoint(ctx, label, account, amountYieldTokenHolding, holdingPeriod, point, updatedAt);
  }
}

function increasePoint(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  amountYieldTokenHolding: bigint,
  holdingPeriod: bigint,
  point: bigint,
  updatedAt: number
) {
  // ctx.eventLogger.emit(EVENT_POINT_INCREASE, {
  //   label,
  //   account: account.toLowerCase(),
  //   amountYieldTokenHolding: amountYieldTokenHolding.scaleDown(18),
  //   holdingPeriod,
  //   point: point.scaleDown(18),
  //   updatedAt,
  // });
}

function calcTreasuryFee(amount: bigint): bigint {
  return (amount * 3n) / 100n;
}
