import { BPS, bps } from './money.ts';

/** 1% fee on every token trade (curve and pool): 70% to the creator, 30% to the treasury. */
export const TRADE_FEE_BPS = 100n;
export const CREATOR_SHARE_BPS = 7_000n;
/** AXP: protocol takes 5% of the job price; an evaluator, when named, takes another 5%. */
export const AXP_PROTOCOL_BPS = 500n;
export const AXP_EVALUATOR_BPS = 500n;
/** Launch modules (USDC, 6 decimals). */
export const MODULE_FEES = { capitalFormation: 10_000_000n, launchRadar: 100_000_000n, sixtyDays: 0n, antiSniper: 0n } as const;

export function splitTradeFee(fee: bigint) {
  const creator = (fee * CREATOR_SHARE_BPS) / BPS;
  return { creator, treasury: fee - creator };
}

export function splitJobPayout(price: bigint, withEvaluator: boolean) {
  const protocol = bps(price, AXP_PROTOCOL_BPS);
  const evaluator = withEvaluator ? bps(price, AXP_EVALUATOR_BPS) : 0n;
  return { provider: price - protocol - evaluator, evaluator, protocol };
}
