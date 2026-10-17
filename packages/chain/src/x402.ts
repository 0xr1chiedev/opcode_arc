import { createWalletClient, http, verifyTypedData, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { DomainError } from '../../core/src/errors.ts';
import * as X from '../../core/src/x402.ts';
import { ARC_MAINNET, arcChain } from './arc.ts';
import type { ArcEvmChain } from './evm.ts';
import type { ChainAdapter, Move } from './adapter.ts';

export interface NonceStore { used(payer: string, nonce: string): boolean; mark(payer: string, nonce: string, at: number): void }
export interface Relayer { address: Hex; send(tx: { to: Hex; data: Hex }): Promise<Hex> }

/** Relayer that submits transferWithAuthorization on Arc. Gas is paid in USDC by the relayer account. */
export function viemRelayer(privateKey: Hex, rpcUrl: string = ARC_MAINNET.rpcUrl): Relayer {
  const account = privateKeyToAccount(privateKey);
  const wallet = createWalletClient({ account, chain: arcChain(rpcUrl), transport: http(rpcUrl) });
  return { address: account.address, send: (tx) => wallet.sendTransaction({ to: tx.to, data: tx.data, chain: arcChain(rpcUrl), account }) };
}

/**
 * x402 facilitator for Arc ("exact" scheme, EIP-3009 USDC).
 * verify: payload shape, amount, payee, validity window, EIP-712 signature, nonce replay, payer balance.
 * settle: on the simulator moves USDC atomically (plus optional split moves);
 *         on Arc submits transferWithAuthorization through the relayer.
 */
export class X402Facilitator {
  private chain: ChainAdapter; private nonces: NonceStore; private relayer: Relayer | null; private now: () => number;
  constructor(o: { chain: ChainAdapter; nonces: NonceStore; relayer?: Relayer | null; now?: () => number }) { this.chain = o.chain; this.nonces = o.nonces; this.relayer = o.relayer ?? null; this.now = o.now ?? Date.now; }

  supported() { return { kinds: [{ x402Version: X.X402_VERSION, scheme: 'exact', network: X.ARC_NETWORK }], extensions: [], signers: this.relayer ? { [X.ARC_NETWORK]: [this.relayer.address] } : {} }; }

  async verify(p: X.PaymentPayload | null, req: X.PaymentRequirements): Promise<X.VerifyResponse> {
    const reason = X.checkPayload(p, req, this.now());
    const payer = p?.payload?.authorization?.from ?? null;
    if (reason) return { isValid: false, payer, invalidReason: reason };
    const a = p!.payload.authorization, td = X.transferTypedData(req, a);
    const ok = await verifyTypedData({ address: a.from, ...td, signature: p!.payload.signature }).catch(() => false);
    if (!ok) return { isValid: false, payer, invalidReason: 'invalid_signature' };
    if (this.nonces.used(a.from, a.nonce)) return { isValid: false, payer, invalidReason: 'nonce_already_used' };
    const bal = await this.chain.balanceOf('USDC', a.from).catch(() => null);
    if (bal !== null && bal < BigInt(a.value)) return { isValid: false, payer, invalidReason: 'insufficient_funds' };
    return { isValid: true, payer: a.from };
  }

  async settle(p: X.PaymentPayload | null, req: X.PaymentRequirements, after: Move[] = []): Promise<X.SettleResponse> {
    const v = await this.verify(p, req);
    const base = { network: req.network, payer: v.payer ?? '', amount: req.amount };
    if (!v.isValid) return { success: false, transaction: '', errorReason: v.invalidReason, ...base };
    const a = p!.payload.authorization;
    this.nonces.mark(a.from, a.nonce, this.now());                    // reserve before moving funds: no replay window
    if (this.chain.mode === 'sim') {
      const r = await this.chain.execute({ kind: 'x402.settle', args: { authorization: a }, moves: [{ asset: 'USDC', from: a.from, to: a.to, amount: BigInt(a.value) }, ...after] }, a.from);
      return { success: true, transaction: r.status === 'confirmed' ? r.txHash : '', ...base };
    }
    if (!this.relayer) throw new DomainError('X402_RELAYER_NOT_CONFIGURED', 'x402 settlement on Arc needs X402_RELAYER_KEY.', 501);
    const { to, data } = (this.chain as ArcEvmChain).encode({ kind: 'x402.settle', args: { authorization: a, signature: p!.payload.signature }, moves: [] });
    const hash = await this.relayer.send({ to, data });
    return { success: true, transaction: hash, ...base };
  }
}

/** Client side: builds a signed PAYMENT-SIGNATURE header value (used by tests, SDKs and PAX). */
export async function signPayment(signer: { address: Hex; signTypedData: (td: any) => Promise<Hex> }, req: X.PaymentRequirements, nowMs: number, nonce: Hex): Promise<{ header: string; payload: X.PaymentPayload }> {
  const now = Math.floor(nowMs / 1000);
  const authorization: X.Eip3009Authorization = { from: signer.address, to: req.payTo, value: req.amount, validAfter: String(now - 5), validBefore: String(now + req.maxTimeoutSeconds), nonce };
  const signature = await signer.signTypedData(X.transferTypedData(req, authorization));
  const payload: X.PaymentPayload = { x402Version: X.X402_VERSION, accepted: req, payload: { signature, authorization } };
  return { header: X.encodeHeader(payload), payload };
}
