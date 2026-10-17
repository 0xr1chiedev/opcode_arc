import type { IncomingMessage, ServerResponse } from 'node:http';
import { DomainError, toJSON } from '../../../packages/core/src/index.ts';

export interface Req { method: string; path: string; query: URLSearchParams; params: Record<string, string>; body: any; headers: IncomingMessage['headers']; user: string | null }
export type Handler = (r: Req) => Promise<unknown> | unknown;
interface Route { method: string; re: RegExp; keys: string[]; auth: boolean; h: Handler }

export class Router {
  private routes: Route[] = [];
  add(method: string, pattern: string, h: Handler, opts: { auth?: boolean } = {}) {
    const keys: string[] = [];
    const re = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_m, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    this.routes.push({ method, re, keys, auth: !!opts.auth, h });
  }
  get = (p: string, h: Handler, o?: { auth?: boolean }) => this.add('GET', p, h, o);
  post = (p: string, h: Handler, o?: { auth?: boolean }) => this.add('POST', p, h, o);
  del = (p: string, h: Handler, o?: { auth?: boolean }) => this.add('DELETE', p, h, o);
  match(method: string, path: string) {
    for (const r of this.routes) { if (r.method !== method) continue; const m = path.match(r.re); if (m) return { route: r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1]!)])) }; }
    return null;
  }
}

export async function readBody(req: IncomingMessage, limit = 1_000_000): Promise<any> {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  let size = 0; const chunks: Buffer[] = [];
  for await (const c of req) { size += (c as Buffer).length; if (size > limit) throw new DomainError('TOO_LARGE', 'Request body is too large.', 413); chunks.push(c as Buffer); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new DomainError('BAD_JSON', 'Request body must be JSON.'); }
}

/** A handler result with its own status and headers (x402 responses, JSON-RPC). */
export class Raw { status: number; body: unknown; headers: Record<string, string>; constructor(status: number, body: unknown, headers: Record<string, string> = {}) { this.status = status; this.body = body; this.headers = headers; } }

export function send(res: ServerResponse, status: number, data: unknown, cors: string, extra: Record<string, string> = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': cors, 'access-control-allow-headers': 'authorization, content-type, payment-signature, x-payment', 'access-control-expose-headers': 'payment-required, payment-response, x-payment-response', 'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS', 'cache-control': 'no-store', ...extra });
  res.end(JSON.stringify(toJSON(data)));
}

/** Parses USDC/token amounts sent as decimal strings ("12.5") into base units. */
export function amount(v: unknown, decimals: number, field: string): bigint {
  if (typeof v !== 'string' && typeof v !== 'number') throw new DomainError('BAD_INPUT', `${field} is required.`);
  const s = String(v).trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new DomainError('BAD_INPUT', `${field} must be a positive decimal string.`);
  const [i, f = ''] = s.split('.');
  if (f.length > decimals) throw new DomainError('BAD_INPUT', `${field} has too many decimals.`);
  return BigInt(i!) * 10n ** BigInt(decimals) + BigInt((f + '0'.repeat(decimals)).slice(0, decimals) || '0');
}
export const str = (v: unknown, field: string, max = 400): string => { if (typeof v !== 'string' || !v.trim()) throw new DomainError('BAD_INPUT', `${field} is required.`); if (v.length > max) throw new DomainError('BAD_INPUT', `${field} is too long.`); return v.trim(); };
