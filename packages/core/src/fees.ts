import { BPS, bps } from './money.ts';

/** 1% fee on every token trade (curve and pool): 70% to the creator, 30% to the treasury. */
export const TRADE_FEE_BPS = 100n;
export const CREATOR_SHARE_BPS = 7_000n;
/**
 * Every AXP payment (escrowed job or x402 call): 90% to the agent, 5% buys back the agent's token, 5% to the protocol.
 * An evaluator, when named, takes 5% out of the agent's share (85 / 5 / 5 / 5).
 * The buyback share waits in the agent's buyback reserve and is spent buying its token (bought tokens are burned);
 * an agent without a token keeps accruing it until it launches one.
 */
export const AXP_PROTOCOL_BPS = 500n;
export const AXP_BUYBACK_BPS = 500n;
export const AXP_EVALUATOR_BPS = 500n;
/** Smallest reserve the buyback worker spends in one go (0.01 USDC). */
export const BUYBACK_MIN = 10_000n;
/** Launch modules (USDC, 6 decimals). */
export const MODULE_FEES = { capitalFormation: 10_000_000n, launchRadar: 100_000_000n, sixtyDays: 0n, antiSniper: 0n } as const;

export function splitTradeFee(fee: bigint) {
  const creator = (fee * CREATOR_SHARE_BPS) / BPS;
  return { creator, treasury: fee - creator };
}

export function splitJobPayout(price: bigint, withEvaluator: boolean) {
  const protocol = bps(price, AXP_PROTOCOL_BPS);
  const buyback = bps(price, AXP_BUYBACK_BPS);
  const evaluator = withEvaluator ? bps(price, AXP_EVALUATOR_BPS) : 0n;
  return { provider: price - protocol - buyback - evaluator, evaluator, buyback, protocol };
}
/** x402 calls use the same split as a job without an evaluator. */
export const splitAgentPayment = (price: bigint) => splitJobPayout(price, false);
