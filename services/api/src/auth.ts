import { randomBytes } from 'node:crypto';
import { verifyMessage, isAddress, getAddress } from 'viem';
import { ARC_MAINNET } from '../../../packages/chain/src/index.ts';
import { DomainError } from '../../../packages/core/src/index.ts';
import { lc, type Ctx } from './ctx.ts';
import type { User } from './types.ts';
import { agentFromKey } from './services/agents.ts';

/** Sign-in with an Ethereum wallet on Arc (EIP-4361 style message, EIP-191 signature). No transaction, no gas. */
export function signInMessage(domain: string, address: string, nonce: string, issuedAt: number) {
  return `${domain} wants you to sign in with your Ethereum account:\n${getAddress(address)}\n\nSign in to Opcode. This does not send a transaction or cost gas.\n\nURI: https://${domain}\nVersion: 1\nChain ID: ${ARC_MAINNET.id}\nNonce: ${nonce}\nIssued At: ${new Date(issuedAt).toISOString()}`;
}

export function issueNonce(ctx: Ctx, address: string) {
  if (!isAddress(address)) throw new DomainError('BAD_ADDRESS', 'That is not a valid wallet address.');
  const nonce = randomBytes(12).toString('hex'), issuedAt = ctx.now();
  ctx.store.state.nonces[lc(address)] = { nonce, issuedAt };
  return { nonce, message: signInMessage(ctx.cfg.domain, address, nonce, issuedAt) };
}

export function ensureUser(ctx: Ctx, address: string): User {
  const s = ctx.store.state, a = lc(address);
  return (s.users[a] ??= { address: a, name: null, createdAt: ctx.now(), x: null, points: { earned: 0n, locked: 0n, burned: 0n } });
}

function openSession(ctx: Ctx, address: string) {
  const token = randomBytes(32).toString('hex');
  ctx.store.state.sessions[token] = { token, address: lc(address), expiresAt: ctx.now() + ctx.cfg.sessionTtlMs };
  return { token, user: ensureUser(ctx, address) };
}

export async function verifySignIn(ctx: Ctx, address: string, signature: string) {
  const n = ctx.store.state.nonces[lc(address ?? '')];
  if (!n || ctx.now() - n.issuedAt > 10 * 60_000) throw new DomainError('NONCE', 'Sign-in expired. Request a new message.', 401);
  const message = signInMessage(ctx.cfg.domain, address, n.nonce, n.issuedAt);
  const ok = await verifyMessage({ address: address as `0x${string}`, message, signature: signature as `0x${string}` }).catch(() => false);
  if (!ok) throw new DomainError('BAD_SIGNATURE', 'The signature does not match this wallet.', 401);
  delete ctx.store.state.nonces[lc(address)];
  return openSession(ctx, address);
}

/** Development only (simulated chain): sign in without a wallet, like the preview's demo account. */
export function devSignIn(ctx: Ctx, address: string) {
  if (!ctx.cfg.allowDev) throw new DomainError('FORBIDDEN', 'Dev sign-in is disabled.', 403);
  if (!isAddress(address)) throw new DomainError('BAD_ADDRESS', 'That is not a valid wallet address.');
  return openSession(ctx, address);
}

export function userFromHeader(ctx: Ctx, header: string | undefined): string | null {
  const ak = header?.match(/^Bearer\s+(ak_\S+)$/); if (ak) return agentFromKey(ctx, ak[1]!);
  const m = header?.match(/^Bearer\s+([0-9a-f]{64})$/i); if (!m) return null;
  const s = ctx.store.state.sessions[m[1]!]; if (!s) return null;
  if (s.expiresAt < ctx.now()) { delete ctx.store.state.sessions[m[1]!]; return null; }
  return s.address;
}
export function signOut(ctx: Ctx, header: string | undefined) { const m = header?.match(/^Bearer\s+(\w+)$/); if (m) delete ctx.store.state.sessions[m[1]!]; }
