import { createServer, type Server } from 'node:http';
import * as C from '../../../packages/core/src/index.ts';
import { ACCT, ARC_MAINNET, ArcEvmChain, SimChain, X402Facilitator, viemRelayer, tokenAsset, type ChainAdapter } from '../../../packages/chain/src/index.ts';
import { CachedPriceFeed, DexScreenerFeed, MockXProvider, QueueAgentRuntime, StaticPriceFeed, XApiProvider, type AgentRuntime, type PriceFeed, type XProvider } from '../../../packages/integrations/src/index.ts';
import { loadConfig, type Config } from './config.ts';
import { MemoryStore, type Store } from './store.ts';
import { Router, Raw, readBody, send, amount, str, type Req } from './http.ts';
import { run, isPending, lc, type Ctx } from './ctx.ts';
import { devSignIn, ensureUser, issueNonce, signOut, userFromHeader, verifySignIn } from './auth.ts';
import { getToken, listTokens, quote, tokenView, trade } from './services/market.ts';
import { createLaunch, commit, getPresale, presaleView, settle, upcoming } from './services/launch.ts';
import { act, getAgent, getJob, openJob, providerActor, searchOfferings } from './services/jobs.ts';
import { leaderboard, linkX, pointsView, submitPost } from './services/points.ts';
import { agentView, createAgent, createKey, revokeKey, walletChallenge, withdraw } from './services/agents.ts';
import { agentCard, a2aRpc, paidCall, platformCard } from './services/a2a.ts';
import { confirmLaunch, getChat, message } from './services/pax.ts';
import { seed } from './seed.ts';
import { tick } from './workers.ts';

const { DomainError } = C;
const U6 = (v: unknown, f: string) => amount(v, 6, f), T18 = (v: unknown, f: string) => amount(v, 18, f);

export interface AppDeps { cfg?: Partial<Config>; store?: Store; chain?: ChainAdapter; x?: XProvider; prices?: PriceFeed; runtime?: AgentRuntime; now?: () => number }

export function createApp(deps: AppDeps = {}) {
  const cfg = { ...loadConfig(), ...deps.cfg } as Config;
  const now = deps.now ?? Date.now;
  const chain = deps.chain ?? (cfg.chainMode === 'arc' ? new ArcEvmChain({ rpcUrl: cfg.rpcUrl, addresses: cfg.addresses }) : new SimChain({ now }));
  const x = deps.x ?? (cfg.x.mode === 'api' ? new XApiProvider(cfg.x) : new MockXProvider({ now }));
  const prices = deps.prices ?? new CachedPriceFeed(cfg.prices === 'static' ? [new StaticPriceFeed()] : [new DexScreenerFeed(), new StaticPriceFeed()]);
  const store = deps.store ?? new MemoryStore({ file: cfg.storeFile });
  const x402 = new X402Facilitator({ chain, now, relayer: cfg.x402.relayerKey ? viemRelayer(cfg.x402.relayerKey as `0x${string}`, cfg.rpcUrl) : null,
    nonces: { used: (p, n) => !!store.state.x402Nonces[p.toLowerCase() + ':' + n], mark: (p, n, at) => { store.state.x402Nonces[p.toLowerCase() + ':' + n] = at; } } });
  const ctx: Ctx = { store, chain, x, prices, runtime: deps.runtime ?? new QueueAgentRuntime(), cfg, now, x402 };
  const r = new Router(), me = (q: Req) => q.user!;
  const sim = () => { if (!(chain instanceof SimChain)) throw new DomainError('SIM_ONLY', 'Only available on the simulated chain.', 403); return chain; };
  const bal = async (asset: Parameters<ChainAdapter['balanceOf']>[0], acct: string) => chain.balanceOf(asset, acct).catch(() => null);

  /* ---- system ---- */
  r.get('/v1/health', async () => ({ ok: true, mode: chain.mode, chainId: ARC_MAINNET.id, block: await chain.blockNumber().catch(() => null), contracts: Object.fromEntries(['agentRegistry', 'jobEscrow', 'curveFactory', 'presaleVault', 'vestingVault', 'pointsLedger', 'paxAccountFactory', 'paymentSplitter', 'treasury'].map((k) => [k, !!(cfg.addresses as Record<string, string>)[k]])), x: x.name, prices: prices.name, x402: { network: 'eip155:5042', relayer: !!cfg.x402.relayerKey } }));
  r.get('/v1/config', () => ({ chain: ARC_MAINNET, fees: { tradeBps: C.TRADE_FEE_BPS, creatorShareBps: C.CREATOR_SHARE_BPS, axpProtocolBps: C.AXP_PROTOCOL_BPS, axpEvaluatorBps: C.AXP_EVALUATOR_BPS, modules: C.MODULE_FEES },
    curve: { supply: C.SUPPLY, x0: C.X0, y0: C.Y0, graduation: C.GRAD, lpLockYears: C.LP_LOCK_YEARS }, presale: { defaultCapBps: C.DEFAULT_CAP_BPS, shareMinBps: C.SHARE_MIN_BPS, shareMaxBps: C.SHARE_MAX_BPS, durationsH: C.DURATIONS_H }, points: C.POINTS_RULES, tokenomics: { rules: C.RULES, presets: C.PRESETS } }));
  r.get('/v1/prices', async (q) => ({ items: await prices.prices((q.query.get('symbols') ?? 'BTC,ETH,SOL,HYPE').split(',').map((s) => s.trim().toUpperCase()).slice(0, 10)) }));

  /* ---- auth ---- */
  r.get('/v1/auth/nonce', (q) => issueNonce(ctx, q.query.get('address') ?? ''));
  r.post('/v1/auth/verify', (q) => verifySignIn(ctx, str(q.body.address, 'address'), str(q.body.signature, 'signature', 300)));
  r.post('/v1/auth/dev', (q) => devSignIn(ctx, str(q.body.address, 'address')));
  r.post('/v1/auth/logout', (q) => { signOut(ctx, q.headers.authorization); return { ok: true }; }, { auth: true });
  r.get('/v1/me', async (q) => { const u = ensureUser(ctx, me(q)); return { user: u, balances: { wallet: await bal('USDC', u.address), pax: await bal('USDC', ACCT.pax(u.address)) }, points: { ...u.points, available: C.available(u.points) } }; }, { auth: true });
  r.get('/v1/me/notifications', (q) => ({ items: ctx.store.state.notices.filter((n) => n.address === me(q)).slice(0, 50) }), { auth: true });
  r.get('/v1/me/holdings', async (q) => ({ items: (await Promise.all(Object.values(ctx.store.state.tokens).map(async (t) => ({ symbol: t.symbol, wallet: await bal(tokenAsset(t.symbol), me(q)), pax: await bal(tokenAsset(t.symbol), ACCT.pax(me(q))), priceWad: tokenView(ctx, t).priceWad })))).filter((h) => (h.wallet ?? 0n) > 0n || (h.pax ?? 0n) > 0n) }), { auth: true });
  r.post('/v1/dev/faucet', (q) => { const c = sim(); const a = U6(q.body.amount ?? '1000', 'amount'); if (a > C.usdc('100000')) throw new DomainError('BAD_INPUT', 'Faucet max is 100,000 USDC.'); return { txHash: c.mint('USDC', me(q), a) }; }, { auth: true });

  /* ---- PAX wallet + chat ---- */
  r.post('/v1/pax/deposit', async (q) => run(ctx, { kind: 'pax.deposit', args: { amount: U6(q.body.amount, 'amount') }, moves: [{ asset: 'USDC', from: me(q), to: ACCT.pax(me(q)), amount: U6(q.body.amount, 'amount') }] }, me(q)), { auth: true });
  r.post('/v1/pax/withdraw', async (q) => run(ctx, { kind: 'pax.withdraw', args: { amount: U6(q.body.amount, 'amount') }, moves: [{ asset: 'USDC', from: ACCT.pax(me(q)), to: me(q), amount: U6(q.body.amount, 'amount') }] }, me(q)), { auth: true });
  r.post('/v1/pax/messages', (q) => message(ctx, me(q), q.body.chatId ?? null, str(q.body.text, 'text', 2000)), { auth: true });
  r.get('/v1/pax/chats', (q) => ({ items: Object.values(ctx.store.state.chats).filter((c) => c.owner === me(q)).map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt, messages: c.messages.length })) }), { auth: true });
  r.get('/v1/pax/chats/:id', (q) => getChat(ctx, me(q), q.params.id), { auth: true });
  r.post('/v1/pax/chats/:id/launch', (q) => confirmLaunch(ctx, me(q), q.params.id!, q.body ?? {}), { auth: true });

  /* ---- AXP ---- */
  r.get('/v1/agents', () => ({ items: Object.values(ctx.store.state.agents).map(agentView) }));
  r.get('/v1/agents/wallet-message', (q) => walletChallenge(ctx, me(q), str(q.query.get('name'), 'name', 32), str(q.query.get('wallet'), 'wallet', 42)), { auth: true });
  r.get('/v1/agents/:id', (q) => agentView(getAgent(ctx, q.params.id!)));
  r.post('/v1/agents', async (q) => agentView(await createAgent(ctx, me(q), { name: str(q.body.name, 'name', 32), description: str(q.body.description, 'description'), category: q.body.category, endpoint: q.body.endpoint ?? null,
    wallet: q.body.wallet ?? null, walletProof: q.body.walletProof ?? null, connection: q.body.connection ?? null, offerings: (q.body.offerings ?? []).map((o: any) => ({ key: str(o.key, 'key', 40), name: o.name, description: str(o.description, 'description'), price: U6(o.price ?? '0', 'price'), pctFeeBps: Number(o.pctFeeBps ?? 0), slaMinutes: Number(o.slaMinutes ?? 10), requirements: o.requirements ?? [], fundTransfer: !!o.fundTransfer, x402: !!o.x402 })) })), { auth: true });
  r.get('/v1/offerings', (q) => ({ items: searchOfferings(ctx, q.query.get('q') ?? '', 20).map((x) => ({ agentId: x.agent.id, agent: x.agent.name, ...x.offering })) }));
  r.post('/v1/jobs', (q) => openJob(ctx, me(q), { agentId: str(q.body.agentId, 'agentId'), offering: str(q.body.offering, 'offering'), requirements: q.body.requirements ?? {}, evaluator: q.body.evaluator ?? null, principal: q.body.principal ? U6(q.body.principal, 'principal') : 0n, payFrom: q.body.payFrom === 'wallet' ? 'wallet' : 'pax' }), { auth: true });
  r.get('/v1/jobs', (q) => ({ items: Object.values(ctx.store.state.jobs).filter((j) => j.client === me(q) || getAgent(ctx, j.provider).owner === me(q) || getAgent(ctx, j.provider).wallet === me(q)).sort((a, b) => b.createdAt - a.createdAt).slice(0, 100) }), { auth: true });
  r.get('/v1/jobs/:id', (q) => getJob(ctx, q.params.id!));
  r.post('/v1/jobs/:id/fund', (q) => act(ctx, me(q), q.params.id!, { type: 'fund', by: me(q) }), { auth: true });
  r.post('/v1/jobs/:id/complete', (q) => act(ctx, me(q), q.params.id!, { type: 'complete', by: me(q) }), { auth: true });
  r.post('/v1/jobs/:id/reject', (q) => { const j = getJob(ctx, q.params.id!); const by = j.client === me(q) || j.evaluator === me(q) ? me(q) : providerActor(ctx, me(q), j.id); return act(ctx, me(q), j.id, { type: 'reject', by, reason: q.body.reason }); }, { auth: true });
  r.post('/v1/jobs/:id/budget', (q) => { const by = providerActor(ctx, me(q), q.params.id!); return act(ctx, me(q), q.params.id!, { type: 'set_budget', by, price: U6(q.body.price, 'price') }); }, { auth: true });
  r.post('/v1/jobs/:id/submit', (q) => { const by = providerActor(ctx, me(q), q.params.id!); return act(ctx, me(q), q.params.id!, { type: 'submit', by, deliverable: str(q.body.deliverable, 'deliverable', 20_000) }); }, { auth: true });

  /* ---- tokens ---- */
  r.get('/v1/tokens', (q) => listTokens(ctx, { sort: q.query.get('sort') ?? undefined, category: q.query.get('category') ?? undefined, search: q.query.get('q') ?? undefined, page: Number(q.query.get('page') ?? 0), per: Number(q.query.get('per') ?? 40) }));
  r.get('/v1/tokens/:sym', (q) => tokenView(ctx, getToken(ctx, q.params.sym!)));
  r.get('/v1/tokens/:sym/trades', (q) => ({ items: ctx.store.state.trades.filter((t) => t.symbol === q.params.sym!.toUpperCase()).slice(0, 100) }));
  r.get('/v1/tokens/:sym/quote', (q) => { const t = getToken(ctx, q.params.sym!), side = q.query.get('side') === 'sell' ? 'sell' : 'buy'; const a = side === 'buy' ? U6(q.query.get('amount'), 'amount') : T18(q.query.get('amount'), 'amount'); const x = quote(ctx, t, side, a); return { side, amount: a, out: x.out, venue: x.venue, taxBps: x.tax.taxBps, fee: (x.q as { fee: bigint }).fee, priceAfterWad: (x.q as { priceAfterWad: bigint }).priceAfterWad }; });
  r.post('/v1/tokens/:sym/trade', (q) => { const side = q.body.side === 'sell' ? 'sell' : 'buy'; const a = side === 'buy' ? U6(q.body.amount, 'amount') : T18(q.body.amount, 'amount'); const minOut = q.body.minOut == null ? undefined : side === 'buy' ? T18(q.body.minOut, 'minOut') : U6(q.body.minOut, 'minOut'); return trade(ctx, me(q), q.params.sym!, side, a, minOut, q.body.from === 'pax' ? 'pax' : 'wallet'); }, { auth: true });

  /* ---- launches + presales ---- */
  r.post('/v1/launches', (q) => createLaunch(ctx, me(q), parseSpec(q.body, now())), { auth: true });
  r.get('/v1/launches/upcoming', (q) => ({ items: upcoming(ctx, q.user) }));
  r.get('/v1/launches/:id', (q) => { const l = ctx.store.state.launches[q.params.id!] ?? Object.values(ctx.store.state.launches).find((x) => x.symbol === q.params.id!.toUpperCase()); if (!l) throw new DomainError('NOT_FOUND', 'Launch not found.', 404); return { ...l, presale: l.presaleId ? presaleView(ctx, ctx.store.state.presales[l.presaleId]!, q.user) : null }; });
  r.get('/v1/presales/:id', (q) => presaleView(ctx, getPresale(ctx, q.params.id!), q.user));
  r.post('/v1/presales/:id/commit', (q) => commit(ctx, me(q), q.params.id!, BigInt(Math.max(0, Math.floor(Number(q.body.points ?? 0)))), q.body.usdc ? U6(q.body.usdc, 'usdc') : 0n), { auth: true });
  r.post('/v1/presales/:id/settle', (q) => settle(ctx, q.params.id!));

  /* ---- points ---- */
  r.get('/v1/points', (q) => pointsView(ctx, me(q)), { auth: true });
  r.get('/v1/points/leaderboard', () => ({ items: leaderboard(ctx) }));
  r.get('/v1/points/x/authorize', (q) => ({ url: x.authorizeUrl(String(q.query.get('state') ?? ''), String(q.query.get('challenge') ?? '')) }), { auth: true });
  r.post('/v1/points/x/link', (q) => linkX(ctx, me(q), str(q.body.code, 'code', 2000), q.body.verifier ?? ''), { auth: true });
  r.post('/v1/points/submissions', (q) => submitPost(ctx, me(q), str(q.body.url, 'url', 300)), { auth: true });

  /* ---- agent connectivity: keys, wallets, A2A, x402 ---- */
  r.post('/v1/agents/:id/keys', (q) => createKey(ctx, me(q), q.params.id!, q.body.label), { auth: true });
  r.get('/v1/agents/:id/keys', (q) => { const a = getAgent(ctx, q.params.id!); if (a.owner !== me(q)) throw new DomainError('FORBIDDEN', 'Owner only.', 403); return { items: a.keys.map(({ hash, ...k }) => k) }; }, { auth: true });
  r.del('/v1/agents/:id/keys/:key', (q) => revokeKey(ctx, me(q), q.params.id!, q.params.key!), { auth: true });
  r.post('/v1/agents/:id/withdraw', (q) => withdraw(ctx, me(q), q.params.id!, U6(q.body.amount, 'amount')), { auth: true });
  r.get('/v1/agents/:id/agent-card.json', (q) => agentCard(ctx, getAgent(ctx, q.params.id!)));
  r.get('/.well-known/agent-card.json', () => platformCard(ctx));
  r.post('/v1/a2a/:id', (q) => a2aRpc(ctx, q));
  r.get('/v1/x402/supported', () => x402.supported());
  r.post('/v1/x402/verify', (q) => x402.verify(q.body.paymentPayload ?? null, q.body.paymentRequirements));
  r.post('/v1/x402/settle', (q) => x402.settle(q.body.paymentPayload ?? null, q.body.paymentRequirements));
  r.post('/v1/x402/agents/:id/:offering', (q) => paidCall(ctx, q));
  r.get('/v1/x402/calls', (q) => ({ items: ctx.store.state.calls.filter((c) => !q.query.get('agent') || c.agentId === q.query.get('agent')).slice(0, 100) }));

  async function handle(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) {
    if (req.method === 'OPTIONS') return send(res, 204, null, cfg.corsOrigin);
    const url = new URL(req.url ?? '/', 'http://local');
    try {
      const m = r.match(req.method ?? 'GET', url.pathname);
      if (!m) throw new DomainError('NOT_FOUND', 'No such endpoint.', 404);
      const user = userFromHeader(ctx, req.headers.authorization);
      if (m.route.auth && !user) throw new DomainError('UNAUTHORIZED', 'Sign in with your wallet first.', 401);
      const body = await readBody(req);
      const out = await m.route.h({ method: req.method!, path: url.pathname, query: url.searchParams, params: m.params, body, headers: req.headers, user });
      if (out instanceof Raw) send(res, out.status, out.body, cfg.corsOrigin, out.headers);
      else send(res, isPending(out) ? 202 : 200, out, cfg.corsOrigin);
    } catch (e) {
      const d = e instanceof DomainError ? e : null;
      if (!d) console.error(e);
      send(res, d?.status ?? 500, { error: { code: d?.code ?? 'INTERNAL', message: d ? d.message : 'Something went wrong.' } }, cfg.corsOrigin);
    }
  }
  const server: Server = createServer((q, s) => { void handle(q, s); });
  return { ctx, server, handle, tick: () => tick(ctx), seed: () => seed(ctx) };
}

/** Request body → LaunchSpec. Amounts arrive as decimal strings. */
function parseSpec(b: any, now: number): C.LaunchSpec {
  const type = b.type === 'presale' ? 'presale' : 'standard';
  const tk = b.tokenomics ?? C.defaultTokenomics(b.preset ?? 'balanced', type === 'presale' ? Number(b.presale?.sharePct ?? 20) : 0);
  return {
    type, name: str(b.name, 'name', 32), symbol: str(b.symbol, 'symbol', 8).toUpperCase(), description: String(b.description ?? ''), agentId: b.agentId ?? null, links: b.links,
    tokenomics: tk, modules: { capitalFormation: b.modules?.capitalFormation !== false, launchRadar: !!b.modules?.launchRadar, sixtyDays: !!b.modules?.sixtyDays },
    sniper: { windowSec: Number(b.sniper?.windowSec ?? (type === 'standard' ? 600 : 0)), side: b.sniper?.side === 'both' ? 'both' : 'buy' },
    startTs: b.startTs ? Number(b.startTs) : now + Number(b.startInH ?? 0) * 3_600_000, prebuy: b.prebuy ? amount(b.prebuy, 6, 'prebuy') : 0n,
    presale: type === 'presale' ? { target: amount(b.presale?.target, 6, 'presale.target'), capPerWallet: b.presale?.capPerWallet ? amount(b.presale.capPerWallet, 6, 'presale.capPerWallet') : C.defaultCap(amount(b.presale?.target, 6, 'presale.target')), shareBps: BigInt(Math.round(Number(b.presale?.sharePct ?? 20) * 100)), minPoints: BigInt(b.presale?.minPoints ?? 100), durationH: Number(b.presale?.durationH ?? 48) } : undefined,
  };
}
export { lc };
