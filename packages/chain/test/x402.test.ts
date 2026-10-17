import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, toHex, decodeFunctionData } from 'viem';
import { x402 as X } from '../../core/src/index.ts';
import { SimChain, X402Facilitator, signPayment, ArcEvmChain, ERC20_ABI, ARC_MAINNET } from '../src/index.ts';

const payer = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');
const agent = '0x00000000000000000000000000000000000a6e17' as const;
const nonce = (i: number) => keccak256(toHex('n' + i));
const mkNonces = () => { const m = new Map<string, number>(); return { used: (p: string, n: string) => m.has(p.toLowerCase() + n), mark: (p: string, n: string, at: number) => m.set(p.toLowerCase() + n, at) }; };
const T0 = Date.UTC(2026, 9, 17, 12);

test('x402: 402 requirements → signed EIP-3009 payload → verify → settle once', async () => {
  const chain = new SimChain(); chain.mint('USDC', payer.address, 1_000_000n);
  const f = new X402Facilitator({ chain, nonces: mkNonces(), now: () => T0 });
  const req = X.requirements({ amount: 50_000n, payTo: agent, asset: ARC_MAINNET.usdc, tokenName: 'USDC', tokenVersion: '2' });
  assert.equal(req.network, 'eip155:5042');
  const pr = X.paymentRequired({ url: '/x', description: 'alpha ping', mimeType: 'application/json' }, [req]);
  assert.deepEqual(X.decodeHeader(X.encodeHeader(pr)), pr);
  const { header, payload } = await signPayment(payer, req, T0, nonce(1));
  assert.deepEqual(X.decodeHeader(header), payload);
  assert.deepEqual(await f.verify(payload, req), { isValid: true, payer: payer.address });
  const s = await f.settle(payload, req, [{ asset: 'USDC', from: agent, to: 'protocol', amount: 2_500n }]);
  assert.equal(s.success, true); assert.match(s.transaction, /^0x[0-9a-f]{64}$/);
  assert.equal(chain.balanceSync('USDC', payer.address), 950_000n);
  assert.equal(chain.balanceSync('USDC', agent), 47_500n); assert.equal(chain.balanceSync('USDC', 'protocol'), 2_500n);
  assert.equal((await f.settle(payload, req)).errorReason, 'nonce_already_used');
});

test('x402: rejects wrong amount, payee, expired, tampered and unfunded payments', async () => {
  const chain = new SimChain(); chain.mint('USDC', payer.address, 60_000n);
  const f = new X402Facilitator({ chain, nonces: mkNonces(), now: () => T0 });
  const req = X.requirements({ amount: 50_000n, payTo: agent, asset: ARC_MAINNET.usdc, tokenName: 'USDC', tokenVersion: '2' });
  const { payload } = await signPayment(payer, req, T0, nonce(2));
  assert.equal((await f.verify(payload, { ...req, amount: '60000' })).invalidReason, 'invalid_amount');
  assert.equal((await f.verify(payload, { ...req, payTo: ('0x' + '9'.repeat(40)) as `0x${string}` })).invalidReason, 'invalid_pay_to');
  assert.equal((await new X402Facilitator({ chain, nonces: mkNonces(), now: () => T0 + 600_000 }).verify(payload, req)).invalidReason, 'authorization_expired');
  const tampered = structuredClone(payload); tampered.payload.authorization.from = ('0x' + '1'.repeat(40)) as `0x${string}`;
  assert.equal((await f.verify(tampered, req)).invalidReason, 'invalid_signature');
  const big = X.requirements({ amount: 70_000n, payTo: agent, asset: ARC_MAINNET.usdc, tokenName: 'USDC', tokenVersion: '2' });
  assert.equal((await f.verify((await signPayment(payer, big, T0, nonce(3))).payload, big)).invalidReason, 'insufficient_funds');
  assert.equal((await f.verify(null, req)).invalidReason, 'invalid_payload');
});

test('x402 on Arc: needs a relayer; with one it submits transferWithAuthorization to USDC', async () => {
  const sent: { to: string; data: `0x${string}` }[] = [];
  const arc = new ArcEvmChain({ addresses: {} });
  const nonces = mkNonces();
  const req = X.requirements({ amount: 50_000n, payTo: agent, asset: ARC_MAINNET.usdc, tokenName: 'USDC', tokenVersion: '2' });
  const { payload } = await signPayment(payer, req, T0, nonce(4));
  // balance read would hit the RPC; stub it for an offline test
  (arc as any).balanceOf = async () => 10n ** 9n;
  await assert.rejects(new X402Facilitator({ chain: arc, nonces: mkNonces(), now: () => T0 }).settle(payload, req), (e: any) => e.code === 'X402_RELAYER_NOT_CONFIGURED');
  const f = new X402Facilitator({ chain: arc, nonces, now: () => T0, relayer: { address: '0x' + '7'.repeat(40) as `0x${string}`, send: async (tx) => { sent.push(tx); return ('0x' + 'ab'.repeat(32)) as `0x${string}`; } } });
  const s = await f.settle(payload, req);
  assert.equal(s.success, true); assert.equal(sent[0]!.to, ARC_MAINNET.usdc);
  const d = decodeFunctionData({ abi: ERC20_ABI, data: sent[0]!.data });
  assert.equal(d.functionName, 'transferWithAuthorization'); assert.equal((d.args as readonly unknown[] as any[])[1].toLowerCase(), agent); assert.equal((d.args as readonly unknown[] as any[])[2], 50_000n);
});
