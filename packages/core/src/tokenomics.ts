import { BPS } from './money.ts';
import { SUPPLY } from './curve.ts';

/** Supply buckets in whole percent. Locked buckets vest linearly after a cliff. */
export type Bucket = 'presale' | 'curve' | 'team' | 'airdrop' | 'ecosystem' | 'treasury';
export const BUCKETS: Bucket[] = ['presale', 'curve', 'team', 'airdrop', 'ecosystem', 'treasury'];
export interface Vesting { cliffMonths: number; months: number }
export interface Tokenomics {
  pct: Record<Bucket, number>;
  team: Vesting; ecosystem: Vesting; treasury: Vesting;
  airdrop: { to: 'points' | 'holders' | 'list'; tgePct: number; months: number };
}
export const RULES = { curveMin: 20, teamMax: 25 } as const;

export const PRESETS: Record<'balanced' | 'fair' | 'community', Omit<Record<Bucket, number>, 'presale'>> = {
  balanced: { curve: 60, team: 15, airdrop: 10, ecosystem: 10, treasury: 5 },
  fair: { curve: 85, team: 0, airdrop: 10, ecosystem: 5, treasury: 0 },
  community: { curve: 55, team: 10, airdrop: 25, ecosystem: 7, treasury: 3 },
};

export function defaultTokenomics(preset: keyof typeof PRESETS = 'balanced', presalePct = 0): Tokenomics {
  const p = PRESETS[preset];
  return { pct: { presale: presalePct, ...p, curve: p.curve - presalePct }, team: { cliffMonths: 6, months: 24 }, ecosystem: { cliffMonths: 0, months: 36 }, treasury: { cliffMonths: 12, months: 24 }, airdrop: { to: 'points', tgePct: 25, months: 6 } };
}

export function validateTokenomics(t: Tokenomics, opts: { presale: boolean }): string[] {
  const e: string[] = [], p = t.pct;
  if (BUCKETS.some((b) => !Number.isInteger(p[b]) || p[b] < 0)) e.push('Each share must be a whole, non-negative percent.');
  const sum = BUCKETS.reduce((s, b) => s + p[b], 0);
  if (sum !== 100) e.push(`Shares must add up to 100% (now ${sum}%).`);
  if (p.curve < RULES.curveMin) e.push(`Keep at least ${RULES.curveMin}% on the bonding curve.`);
  if (p.team > RULES.teamMax) e.push(`Team share is capped at ${RULES.teamMax}%.`);
  if (opts.presale && (p.presale < 10 || p.presale > 30)) e.push('A presale launch sells 10% to 30% of supply.');
  if (!opts.presale && p.presale !== 0) e.push('Only presale launches have a presale share.');
  for (const k of ['team', 'ecosystem', 'treasury'] as const) if (t[k].cliffMonths < 0 || t[k].months < 0 || t[k].cliffMonths > 48 || t[k].months > 72) e.push(`${k} vesting is out of range.`);
  if (t.airdrop.tgePct < 0 || t.airdrop.tgePct > 100) e.push('Airdrop unlock at launch must be 0–100%.');
  return e;
}

export const bucketAmount = (t: Tokenomics, b: Bucket) => (SUPPLY * BigInt(t.pct[b]) * 100n) / BPS;

/** Amount vested at `now` for a bucket that starts at `startTs`. Months are 30 days. */
export function vested(total: bigint, v: Vesting, startTs: number, now: number): bigint {
  const M = 30 * 86_400_000, cliffEnd = startTs + v.cliffMonths * M;
  if (now < cliffEnd) return 0n;
  if (v.months === 0) return total;
  const elapsed = BigInt(Math.min(now - cliffEnd, v.months * M));
  return (total * elapsed) / BigInt(v.months * M);
}
