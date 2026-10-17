/**
 * x402 v2 ("exact" scheme, EIP-3009) on Arc.
 * 1. Server answers 402 with PaymentRequired (body + base64 `PAYMENT-REQUIRED` header).
 * 2. Client signs an EIP-3009 TransferWithAuthorization (EIP-712) for the exact amount and retries
 *    with a base64 `PAYMENT-SIGNATURE` header (v1 `X-PAYMENT` is accepted too).
 * 3. The facilitator verifies and settles; the server returns the resource with a base64 `PAYMENT-RESPONSE` header.
 */
export const X402_VERSION = 2;
export const ARC_NETWORK = 'eip155:5042';
export const HEADERS = { required: 'PAYMENT-REQUIRED', signature: 'PAYMENT-SIGNATURE', response: 'PAYMENT-RESPONSE', v1Payment: 'X-PAYMENT', v1Response: 'X-PAYMENT-RESPONSE' } as const;

type Hex = `0x${string}`;
export interface PaymentRequirements {
  scheme: 'exact'; network: string; amount: string; asset: Hex; payTo: Hex; maxTimeoutSeconds: number;
  extra: { name: string; version: string; assetTransferMethod?: 'eip3009' };
}
export interface PaymentRequired { x402Version: number; error?: string; resource: { url: string; description: string; mimeType: string }; accepts: PaymentRequirements[]; extensions?: Record<string, unknown> }
export interface Eip3009Authorization { from: Hex; to: Hex; value: string; validAfter: string; validBefore: string; nonce: Hex }
export interface PaymentPayload { x402Version: number; accepted: PaymentRequirements; payload: { signature: Hex; authorization: Eip3009Authorization }; resource?: PaymentRequired['resource'] }
export interface VerifyResponse { isValid: boolean; payer: string | null; invalidReason?: string }
export interface SettleResponse { success: boolean; transaction: string; network: string; payer: string; amount?: string; errorReason?: string }

export const encodeHeader = (v: unknown): string => Buffer.from(JSON.stringify(v), 'utf8').toString('base64');
export function decodeHeader<T>(v: string | undefined | null): T | null {
  if (!v) return null;
  try { return JSON.parse(Buffer.from(v, 'base64').toString('utf8')) as T; } catch { return null; }
}

export function requirements(p: { amount: bigint; payTo: Hex; asset: Hex; network?: string; maxTimeoutSeconds?: number; tokenName: string; tokenVersion: string }): PaymentRequirements {
  return { scheme: 'exact', network: p.network ?? ARC_NETWORK, amount: p.amount.toString(), asset: p.asset, payTo: p.payTo, maxTimeoutSeconds: p.maxTimeoutSeconds ?? 120, extra: { name: p.tokenName, version: p.tokenVersion, assetTransferMethod: 'eip3009' } };
}
export function paymentRequired(resource: PaymentRequired['resource'], accepts: PaymentRequirements[], error?: string): PaymentRequired {
  return { x402Version: X402_VERSION, ...(error ? { error } : {}), resource, accepts };
}

/** EIP-712 typed data for USDC's TransferWithAuthorization. */
export function transferTypedData(req: PaymentRequirements, auth: Eip3009Authorization) {
  const chainId = Number(req.network.split(':')[1]);
  return {
    domain: { name: req.extra.name, version: req.extra.version, chainId, verifyingContract: req.asset },
    types: { TransferWithAuthorization: [
      { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' }] },
    primaryType: 'TransferWithAuthorization' as const,
    message: { from: auth.from, to: auth.to, value: BigInt(auth.value), validAfter: BigInt(auth.validAfter), validBefore: BigInt(auth.validBefore), nonce: auth.nonce },
  };
}

const isAddr = (a: unknown): a is Hex => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a);
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Everything that can be checked without the chain. Returns an invalid reason, or null when the payload fits the requirements. */
export function checkPayload(p: PaymentPayload | null, req: PaymentRequirements, nowMs: number): string | null {
  if (!p || typeof p !== 'object') return 'invalid_payload';
  if (p.x402Version !== 1 && p.x402Version !== X402_VERSION) return 'unsupported_version';
  const a = p.payload?.authorization, sig = p.payload?.signature;
  if (!a || typeof sig !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(sig)) return 'invalid_payload';
  if (p.accepted && (p.accepted.scheme !== req.scheme || p.accepted.network !== req.network)) return 'invalid_scheme_or_network';
  if (!isAddr(a.from) || !isAddr(a.to)) return 'invalid_payload';
  if (!same(a.to, req.payTo)) return 'invalid_pay_to';
  if (p.accepted && !same(p.accepted.asset, req.asset)) return 'invalid_asset';
  if (!/^\d+$/.test(a.value) || BigInt(a.value) !== BigInt(req.amount)) return 'invalid_amount';
  if (!/^0x[0-9a-fA-F]{64}$/.test(a.nonce)) return 'invalid_nonce';
  const now = Math.floor(nowMs / 1000);
  if (!/^\d+$/.test(a.validAfter) || !/^\d+$/.test(a.validBefore)) return 'invalid_payload';
  if (Number(a.validAfter) > now) return 'authorization_not_yet_valid';
  if (Number(a.validBefore) < now + 6) return 'authorization_expired';
  if (Number(a.validBefore) - now > req.maxTimeoutSeconds + 60) return 'authorization_window_too_long';
  return null;
}
