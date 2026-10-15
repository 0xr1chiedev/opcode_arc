import { DomainError } from './errors.ts';

/** InfoFi points: posts about Opcode on X, scored by engagement. Not a token; not transferable. */
export const POINTS_RULES = { like: 1n, reply: 2n, repost: 3n, quote: 4n, viewsPer: 100n, perPostCap: 1_500n, perDay: 10, maxAgeDays: 7, trackHours: 72, qualityMinBps: 5_000, qualityMaxBps: 15_000 } as const;
export const X_EPOCH = 1288834974657n;

export interface PostMetrics { views: number; likes: number; reposts: number; replies: number; quotes: number }
export interface Submission { id: string; wallet: string; handle: string; url: string; postedAt: number; submittedAt: number; status: 'pending' | 'tracking' | 'final' | 'rejected'; metrics: PostMetrics | null; qualityBps: number; points: bigint; reason?: string }

export function parsePostUrl(u: string): { handle: string; id: string } | null {
  const m = String(u || '').trim().match(/^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status\/(\d{6,25})(?:[/?#].*)?$/i);
  return m ? { handle: m[1]!, id: m[2]! } : null;
}
/** X post IDs are snowflakes: the top bits are milliseconds since the X epoch. */
export function postTimestamp(id: string): number {
  try { return Number((BigInt(id) >> 22n) + X_EPOCH); } catch { return 0; }
}
export function makeSnowflake(ts: number, seq = 0): string { return (((BigInt(ts) - X_EPOCH) << 22n) | BigInt(seq & 0x3fffff)).toString(); }

export function scorePost(m: PostMetrics, qualityBps: number): bigint {
  const q = BigInt(Math.max(POINTS_RULES.qualityMinBps, Math.min(POINTS_RULES.qualityMaxBps, Math.round(qualityBps))));
  const raw = BigInt(m.likes) * POINTS_RULES.like + BigInt(m.replies) * POINTS_RULES.reply + BigInt(m.reposts) * POINTS_RULES.repost + BigInt(m.quotes) * POINTS_RULES.quote + BigInt(m.views) / POINTS_RULES.viewsPer;
  const s = (raw * q) / 10_000n;
  return s > POINTS_RULES.perPostCap ? POINTS_RULES.perPostCap : s;
}

/** Validates a link against the linked X handle and the submission rules. Throws a DomainError with user-facing copy. */
export function checkSubmission(url: string, ctx: { linkedHandle: string | null; already: Submission[]; now: number }): { handle: string; id: string; postedAt: number } {
  if (!ctx.linkedHandle) throw new DomainError('X_NOT_LINKED', 'Link your X account first.', 409);
  const p = parsePostUrl(url);
  if (!p) throw new DomainError('BAD_LINK', 'That is not a post link. It should look like https://x.com/handle/status/123…');
  if (p.handle.toLowerCase() !== ctx.linkedHandle.toLowerCase()) throw new DomainError('WRONG_ACCOUNT', `This post is from @${p.handle}. Only posts from @${ctx.linkedHandle} count.`);
  if (ctx.already.some((s) => s.id === p.id)) throw new DomainError('DUPLICATE', 'You already submitted this post.', 409);
  const at = postTimestamp(p.id);
  if (!at || at > ctx.now + 60_000) throw new DomainError('BAD_ID', 'That post ID is not valid.');
  if (ctx.now - at > POINTS_RULES.maxAgeDays * 86_400_000) throw new DomainError('TOO_OLD', `Only posts from the last ${POINTS_RULES.maxAgeDays} days count.`);
  if (ctx.already.filter((s) => ctx.now - s.submittedAt < 86_400_000).length >= POINTS_RULES.perDay) throw new DomainError('DAILY_LIMIT', `Daily limit reached (${POINTS_RULES.perDay} posts). Try again tomorrow.`, 429);
  return { ...p, postedAt: at };
}

/** Points ledger for one wallet. available + locked = earned − burned. */
export interface PointsBalance { earned: bigint; locked: bigint; burned: bigint }
export const available = (b: PointsBalance) => b.earned - b.locked - b.burned;
export function lockPoints(b: PointsBalance, amount: bigint): PointsBalance {
  if (amount < 0n) throw new DomainError('AMOUNT', 'Amount cannot be negative.');
  if (amount > available(b)) throw new DomainError('INSUFFICIENT_POINTS', 'More points than you have available.');
  return { ...b, locked: b.locked + amount };
}
export function burnLocked(b: PointsBalance, amount: bigint): PointsBalance {
  if (amount > b.locked) throw new DomainError('LEDGER', 'Cannot burn more than is locked.', 500);
  return { ...b, locked: b.locked - amount, burned: b.burned + amount };
}
