import { DomainError } from '../../core/src/errors.ts';
import type { PostMetrics } from '../../core/src/points.ts';

/** Everything Opcode needs from X. */
export interface XProvider {
  readonly name: string;
  /** URL to start "Sign in with X" (OAuth 2.0 + PKCE). The callback returns the handle; the wallet then signs the link. */
  authorizeUrl(state: string, codeChallenge: string): string;
  /** Exchanges the OAuth code for the user's handle and id. */
  completeAuth(code: string, codeVerifier: string): Promise<{ handle: string; userId: string }>;
  /** Public metrics of a post, plus the author handle so we can check ownership. */
  postMetrics(postId: string): Promise<{ author: string; metrics: PostMetrics; text: string } | null>;
  /** Account quality multiplier in basis points (0.5–1.5). */
  quality(handle: string): Promise<number>;
}

const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** Deterministic X for development and tests: metrics come from the post id and grow with age, like real engagement. */
export class MockXProvider implements XProvider {
  readonly name = 'mock';
  private authors = new Map<string, string>();
  private now: () => number;
  constructor(opts: { now?: () => number } = {}) { this.now = opts.now ?? Date.now; }
  /** Tests and the dev UI register which handle wrote a post (on real X the API tells us). */
  setAuthor(postId: string, handle: string) { this.authors.set(postId, handle); }
  authorizeUrl(state: string) { return `/dev/x/authorize?state=${encodeURIComponent(state)}`; }
  async completeAuth(code: string, _verifier = '') { const handle = code.replace(/^mock:/, ''); if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) throw new DomainError('X_AUTH', 'X sign-in failed.'); return { handle, userId: String(hash(handle)) }; }
  async postMetrics(postId: string) {
    const author = this.authors.get(postId); if (!author) return null;
    const r = rng(hash(postId)); const views = Math.round(Math.exp(Math.log(400) + r() * (Math.log(60000) - Math.log(400)))), likes = Math.round(views * (0.008 + r() * 0.035));
    const reposts = Math.round(likes * (0.06 + r() * 0.22)), replies = Math.round(likes * (0.08 + r() * 0.3)), quotes = Math.round(reposts * (0.05 + r() * 0.3));
    return { author, text: 'Opcode', metrics: { views, likes, reposts, replies, quotes } };
  }
  async quality(handle: string) { return 8_000 + (hash(handle) % 5_000); }
}

/** X API v2. Needs X_CLIENT_ID / X_CLIENT_SECRET for OAuth and X_BEARER_TOKEN for reading posts. */
export class XApiProvider implements XProvider {
  readonly name = 'x-api-v2';
  private cfg: { clientId?: string; clientSecret?: string; bearer?: string; redirectUri?: string };
  constructor(cfg: { clientId?: string; clientSecret?: string; bearer?: string; redirectUri?: string }) { this.cfg = cfg; }
  private need(k: 'clientId' | 'clientSecret' | 'bearer' | 'redirectUri'): string { const v = this.cfg[k]; if (!v) throw new DomainError('X_NOT_CONFIGURED', `X integration is missing ${k}.`, 501); return v; }
  authorizeUrl(state: string, codeChallenge: string) {
    const q = new URLSearchParams({ response_type: 'code', client_id: this.need('clientId'), redirect_uri: this.need('redirectUri'), scope: 'tweet.read users.read offline.access', state, code_challenge: codeChallenge, code_challenge_method: 'S256' });
    return `https://x.com/i/oauth2/authorize?${q}`;
  }
  async completeAuth(code: string, codeVerifier: string) {
    const body = new URLSearchParams({ code, grant_type: 'authorization_code', redirect_uri: this.need('redirectUri'), code_verifier: codeVerifier });
    const basic = Buffer.from(`${this.need('clientId')}:${this.need('clientSecret')}`).toString('base64');
    const tok = await fetch('https://api.x.com/2/oauth2/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: `Basic ${basic}` }, body });
    if (!tok.ok) throw new DomainError('X_AUTH', 'X sign-in failed.', 502);
    const { access_token } = (await tok.json()) as { access_token: string };
    const me = await fetch('https://api.x.com/2/users/me', { headers: { authorization: `Bearer ${access_token}` } });
    if (!me.ok) throw new DomainError('X_AUTH', 'Could not read your X profile.', 502);
    const { data } = (await me.json()) as { data: { id: string; username: string } };
    return { handle: data.username, userId: data.id };
  }
  async postMetrics(postId: string) {
    const r = await fetch(`https://api.x.com/2/tweets/${postId}?tweet.fields=public_metrics,author_id,text&expansions=author_id&user.fields=username`, { headers: { authorization: `Bearer ${this.need('bearer')}` } });
    if (r.status === 404) return null;
    if (!r.ok) throw new DomainError('X_API', `X API error ${r.status}.`, 502);
    const j = (await r.json()) as { data?: { text: string; public_metrics: Record<string, number> }; includes?: { users?: { username: string }[] } };
    if (!j.data) return null;
    const m = j.data.public_metrics;
    return { author: j.includes?.users?.[0]?.username ?? '', text: j.data.text, metrics: { views: m.impression_count ?? 0, likes: m.like_count ?? 0, reposts: m.retweet_count ?? 0, replies: m.reply_count ?? 0, quotes: m.quote_count ?? 0 } };
  }
  async quality(_handle: string) { return 10_000; /* TODO: account age, follower quality, bot score */ }
}
