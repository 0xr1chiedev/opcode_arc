import * as C from '../../../../packages/core/src/index.ts';
import { MockXProvider } from '../../../../packages/integrations/src/index.ts';
import { notify, lc, type Ctx } from '../ctx.ts';
import { ensureUser } from '../auth.ts';
import type { SubmissionRec } from '../types.ts';

const { DomainError } = C;

/** Links an X account to the signed-in wallet. In production the code comes from the X OAuth callback. */
export async function linkX(ctx: Ctx, user: string, code: string, verifier = '') {
  const u = ensureUser(ctx, user), { handle, userId } = await ctx.x.completeAuth(code, verifier);
  const other = Object.values(ctx.store.state.users).find((x) => x.x && x.x.userId === userId && x.address !== u.address);
  if (other) throw new DomainError('X_IN_USE', `@${handle} is already linked to another wallet.`, 409);
  if (u.x && u.x.userId !== userId && ctx.now() - u.x.linkedAt < 30 * 86_400_000) throw new DomainError('X_COOLDOWN', 'You can change your X account once every 30 days.', 409);
  u.x = { handle, userId, linkedAt: ctx.now() };
  return u.x;
}

export async function submitPost(ctx: Ctx, user: string, url: string) {
  const u = ensureUser(ctx, user), mine = ctx.store.state.submissions.filter((s) => s.wallet === u.address);
  const p = C.checkSubmission(url, { linkedHandle: u.x?.handle ?? null, already: mine, now: ctx.now() });
  if (ctx.x instanceof MockXProvider) ctx.x.setAuthor(p.id, p.handle);
  const sub: SubmissionRec = { id: p.id, wallet: u.address, handle: p.handle, url, postedAt: p.postedAt, submittedAt: ctx.now(), status: 'pending', metrics: null, qualityBps: 0, points: 0n, trackUntil: p.postedAt + C.POINTS_RULES.trackHours * 3_600_000, credited: 0n };
  ctx.store.state.submissions.unshift(sub);
  return sub;
}

/** Reads engagement for pending and tracking posts and credits the difference. Runs in the worker. */
export async function trackPosts(ctx: Ctx) {
  const now = ctx.now();
  for (const s of ctx.store.state.submissions) {
    if (s.status !== 'pending' && s.status !== 'tracking') continue;
    const m = await ctx.x.postMetrics(s.id).catch(() => null);
    if (!m) { if (now - s.submittedAt > 3_600_000) { s.status = 'rejected'; s.reason = 'Post not found.'; } continue; }
    if (m.author.toLowerCase() !== s.handle.toLowerCase()) { s.status = 'rejected'; s.reason = 'Post author does not match the linked account.'; continue; }
    const q = s.qualityBps || (await ctx.x.quality(s.handle)); s.qualityBps = q; s.metrics = m.metrics;
    const pts = C.scorePost(m.metrics, q), delta = pts - s.credited;
    const u = ctx.store.state.users[s.wallet];
    if (u && delta > 0n) { u.points = { ...u.points, earned: u.points.earned + delta }; s.credited = pts; }
    const first = s.status === 'pending'; s.points = pts; s.status = now >= s.trackUntil ? 'final' : 'tracking';
    if (first && u) notify(ctx, s.wallet, 'points', `+${pts} points for your post.`);
  }
}

export function pointsView(ctx: Ctx, user: string) {
  const u = ensureUser(ctx, user);
  return { x: u.x, balance: { ...u.points, available: C.available(u.points) }, submissions: ctx.store.state.submissions.filter((s) => s.wallet === u.address).slice(0, 100), rules: C.POINTS_RULES };
}
export function leaderboard(ctx: Ctx, n = 50) {
  return Object.values(ctx.store.state.users).filter((u) => u.points.earned > 0n).sort((a, b) => (b.points.earned > a.points.earned ? 1 : -1)).slice(0, n)
    .map((u, i) => ({ rank: i + 1, address: u.address, handle: u.x?.handle ?? null, earned: u.points.earned }));
}
export const lcUser = lc;
