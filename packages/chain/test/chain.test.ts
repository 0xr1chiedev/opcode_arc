import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeFunctionData } from 'viem';
import { SimChain, ArcEvmChain, ACCT, tokenAsset, addressesFromEnv, CURVE_FACTORY_ABI, ARC_MAINNET } from '../src/index.ts';

const U = (n: number) => BigInt(Math.round(n * 1e6));

test('sim: atomic transfers, no overdraft, conservation', async () => {
  const c = new SimChain();
  c.mint('USDC', '0xA', U(100));
  await c.execute({ kind: 'job.fund', args: {}, moves: [{ asset: 'USDC', from: '0xa', to: ACCT.escrow('1'), amount: U(40) }] }, '0xA');
  assert.equal(await c.balanceOf('USDC', '0xA'), U(60));
  assert.equal(await c.balanceOf('USDC', ACCT.escrow('1')), U(40));
  await assert.rejects(c.execute({ kind: 'usdc.transfer', args: {}, moves: [
    { asset: 'USDC', from: '0xA', to: '0xB', amount: U(50) },
    { asset: 'USDC', from: '0xA', to: '0xB', amount: U(50) }] }, '0xA'), /Not enough USDC/);
  assert.equal(await c.balanceOf('USDC', '0xB'), 0n, 'failed tx changes nothing');
  assert.equal(c.totalOf('USDC'), U(100));
  c.mint(tokenAsset('LUMEN'), ACCT.curve('LUMEN'), 10n);
  assert.equal(await c.balanceOf(tokenAsset('LUMEN'), ACCT.curve('LUMEN')), 10n);
  assert.ok(c.txs.length === 3 && (await c.blockNumber()) > 1);
});

test('arc: config, env addresses, unsigned transactions, contracts not configured', async () => {
  assert.equal(ARC_MAINNET.id, 5042);
  const addrs = addressesFromEnv({ OPCODE_CURVE_FACTORY: '0x' + '11'.repeat(20), OPCODE_JOB_ESCROW: 'bad' });
  assert.deepEqual(Object.keys(addrs), ['curveFactory']);
  const arc = new ArcEvmChain({ addresses: addrs, tokenAddress: (s) => (s === 'LUMEN' ? ('0x' + '22'.repeat(20)) as `0x${string}` : undefined) });
  const r = await arc.execute({ kind: 'curve.buy', args: { symbol: 'LUMEN', usdcIn: U(10), minOut: 1n }, moves: [] }, '0x' + '33'.repeat(20));
  assert.equal(r.status, 'needs_signature');
  if (r.status === 'needs_signature') {
    assert.equal(r.tx.to, addrs.curveFactory); assert.equal(r.tx.chainId, 5042);
    const d = decodeFunctionData({ abi: CURVE_FACTORY_ABI, data: r.tx.data });
    assert.equal(d.functionName, 'buy'); assert.deepEqual(d.args, ['0x' + '22'.repeat(20), U(10), 1n]);
  }
  await assert.rejects(arc.execute({ kind: 'job.fund', args: { chainJobId: 1 }, moves: [] }, '0x' + '33'.repeat(20)), (e: any) => e.code === 'CONTRACT_NOT_CONFIGURED' && e.status === 501);
  await assert.rejects(arc.execute({ kind: 'usdc.transfer', args: {}, moves: [] }, 'pax:0xa'), /signed by a wallet/);
});
