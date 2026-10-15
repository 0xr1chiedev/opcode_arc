import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { MockXProvider, XApiProvider, DexScreenerFeed, CachedPriceFeed, StaticPriceFeed, WebhookAgentRuntime } from '../src/index.ts';

test('mock X: deterministic metrics only for known posts', async () => {
  const x = new MockXProvider(); x.setAuthor('123456789', 'richie_op');
  const a = await x.postMetrics('123456789'), b = await x.postMetrics('123456789');
  assert.deepEqual(a, b); assert.equal(a!.author, 'richie_op'); assert.equal(await x.postMetrics('999999'), null);
  assert.deepEqual(await x.completeAuth('mock:richie_op', ''), { handle: 'richie_op', userId: (await x.completeAuth('mock:richie_op', '')).userId });
});

test('X API: refuses to run without credentials', async () => {
  const x = new XApiProvider({});
  assert.throws(() => x.authorizeUrl('s', 'c'), (e: any) => e.code === 'X_NOT_CONFIGURED' && e.status === 501);
  await assert.rejects(x.postMetrics('1'), (e: any) => e.code === 'X_NOT_CONFIGURED');
  assert.match(new XApiProvider({ clientId: 'id', redirectUri: 'https://opcode.xyz/cb' }).authorizeUrl('s', 'c'), /^https:\/\/x\.com\/i\/oauth2\/authorize\?.*code_challenge=c/);
});

test('DexScreener: deepest pair wins; quote-side pairs are inverted', async () => {
  const fake = (async (url: string) => {
    const hype = url.includes('hyperevm');
    const data = hype ? [{ baseToken: { address: '0xabc' }, quoteToken: { address: '0x5555555555555555555555555555555555555555' }, priceUsd: '1', priceNative: '0.0125', liquidity: { usd: 9e6 } }]
      : [{ baseToken: { address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' }, quoteToken: { address: '0x' }, priceUsd: '81000', liquidity: { usd: 1e5 }, priceChange: { h24: 1 } },
         { baseToken: { address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' }, quoteToken: { address: '0x' }, priceUsd: '82000', liquidity: { usd: 5e7 }, priceChange: { h24: 2 } }];
    return new Response(JSON.stringify(data));
  }) as typeof fetch;
  const q = await new DexScreenerFeed(fake).prices(['BTC', 'HYPE']);
  assert.equal(q.find((x) => x.symbol === 'BTC')!.usd, 82000);
  assert.equal(q.find((x) => x.symbol === 'HYPE')!.usd, 80);
  const failing = { name: 'down', prices: async () => { throw new Error('offline'); } };
  const c = new CachedPriceFeed([failing, new StaticPriceFeed()]);
  assert.equal((await c.prices(['ETH']))[0]!.usd, 2430);
});

test('webhook runtime signs the payload', async () => {
  let got: { body: string; sig: string } | null = null;
  const fake = (async (_u: string, init: RequestInit) => { got = { body: String(init.body), sig: (init.headers as Record<string, string>)['x-opcode-signature']! }; return new Response('ok'); }) as typeof fetch;
  await new WebhookAgentRuntime(fake).dispatch({ id: '1', provider: 'lumen', offering: 'x', requirements: {}, price: '0', client: '0x', createdAt: 0 }, { id: 'lumen', endpoint: 'https://agent.example/hook', secret: 's3' });
  assert.equal(got!.sig, 'sha256=' + createHmac('sha256', 's3').update(got!.body).digest('hex'));
});
