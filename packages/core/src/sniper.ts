import { BPS } from './money.ts';
import { TRADE_FEE_BPS } from './fees.ts';

/** Anti-sniper windows in seconds: off, 60 s, 10 min, 98 min. */
export const SNIPER_WINDOWS = [0, 60, 600, 5880] as const;
export type SniperSide = 'buy' | 'both';
export interface SniperConfig { windowSec: number; side: SniperSide; startTs: number }
export const SNIPER_START_BPS = 9_900n;

/**
 * Total tax on a trade in basis points. Without anti-sniper (or after the window) it is the 1% trade fee.
 * Inside the window it falls linearly from 99% to 1%. Sells are taxed only when side is "both" (98-minute window only).
 * The part above 1% buys tokens back to the team wallet (3-month cliff, 9-month vest).
 */
export function tradeTaxBps(cfg: SniperConfig | null | undefined, side: 'buy' | 'sell', nowTs: number): { taxBps: bigint; feeBps: bigint; buybackBps: bigint } {
  const base = { taxBps: TRADE_FEE_BPS, feeBps: TRADE_FEE_BPS, buybackBps: 0n };
  if (!cfg || !cfg.windowSec) return base;
  if (side === 'sell' && cfg.side !== 'both') return base;
  const elapsed = Math.max(0, Math.floor((nowTs - cfg.startTs) / 1000));
  if (elapsed >= cfg.windowSec) return base;
  const span = SNIPER_START_BPS - TRADE_FEE_BPS;
  const tax = SNIPER_START_BPS - (span * BigInt(elapsed)) / BigInt(cfg.windowSec);
  return { taxBps: tax, feeBps: TRADE_FEE_BPS, buybackBps: tax - TRADE_FEE_BPS };
}

export function validateSniper(cfg: { windowSec: number; side: SniperSide }): string | null {
  if (!(SNIPER_WINDOWS as readonly number[]).includes(cfg.windowSec)) return 'Anti-sniper window must be off, 60 s, 10 min or 98 min.';
  if (cfg.side === 'both' && cfg.windowSec !== 5880) return 'Taxing sells is only available on the 98-minute window.';
  return null;
}
export { BPS };
