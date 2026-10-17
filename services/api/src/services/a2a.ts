import * as C from '../../../../packages/core/src/index.ts';
import { ARC_MAINNET } from '../../../../packages/chain/src/index.ts';
import { simulatedDeliverable } from '../../../../packages/integrations/src/index.ts';
import { Raw, type Req } from '../http.ts';
import { notify, lc, type Ctx } from '../ctx.ts';
import type { Agent, JobRec } from '../types.ts';
import { act, getAgent, getJob, openJob, providerActor } from './jobs.ts';

const { DomainError, x402: X } = C;

/* ---------------- discovery: A2A Agent Cards ---------------- */
const rails = (o: Agent['offerings'][number]) => (o.x402 ? ['x402', 'escrow'] : ['escrow']);
/** A2A 1.0 Agent Card. Skills are the agent's AXP offerings; the `opcode.axp` extension carries prices and payment rails. */
export function agentCard(ctx: Ctx, a: Agent) {
  const base = ctx.cfg.publicUrl.replace(/\/$/, '');
  return {
    name: a.name, description: a.description, version: '1.0.0', provider: { organization: 'Opcode', url: base },
    supportedInterfaces: [{ url: `${base}/v1/a2a/${a.id}`, protocolBinding: 'JSONRPC', protocolVersion: '1.0' }],
    capabilities: { streaming: false, pushNotifications: !!a.endpoint, extensions: [{ uri: 'https://opcode.app/ext/axp/v1', description: 'AXP escrowed jobs on Arc', required: false }, { uri: 'https://x402.org/v2', description: 'Pay per call with x402 on Arc (eip155:5042, USDC)', required: false }] },
    defaultInputModes: ['application/json', 'text/plain'], defaultOutputModes: ['application/json', 'text/plain'],
    securitySchemes: { opcodeBearer: { type: 'http', scheme: 'bearer', description: 'Opcode session (wallet sign-in) or agent key (ak_…)' } }, security: [{ opcodeBearer: [] }],
    skills: a.offerings.map((o) => ({ id: o.key, name: o.name, description: o.description, tags: [a.category.toLowerCase(), ...rails(o)], inputModes: ['application/json'], outputModes: ['text/plain', 'application/json'],
      examples: [JSON.stringify({ offering: o.key, requirements: Object.fromEntries(o.requirements.map(([k, l]) => [k, l])) })] })),
    'opcode.axp': { agentId: a.id, wallet: a.wallet, chainId: ARC_MAINNET.id, network: X.ARC_NETWORK, usdc: ARC_MAINNET.usdc,
      offerings: a.offerings.map((o) => ({ key: o.key, price: o.price, pctFeeBps: o.pctFeeBps, slaMinutes: o.slaMinutes, requirements: o.requirements, fundTransfer: o.fundTransfer, rails: rails(o), x402Endpoint: o.x402 ? `${base}/v1/x402/agents/${a.id}/${o.key}` : null })),
      stats: { jobs: a.stats.jobs, completed: a.stats.completed, revenue: a.stats.revenue } },
  };
}
/** Opcode itself as an agent (PAX): one entry point that routes to every agent on AXP. */
export function platformCard(ctx: Ctx) {
  const base = ctx.cfg.publicUrl.replace(/\/$/, '');
  return { name: 'PAX by Opcode', description: 'Personal Agent eXecutor: finds the right agent on AXP, pays it in USDC on Arc through escrow or x402, and returns the result.', version: '1.0.0',
    provider: { organization: 'Opcode', url: base }, supportedInterfaces: [{ url: `${base}/v1/pax/messages`, protocolBinding: 'HTTP+JSON', protocolVersion: '1.0' }],
    capabilities: { streaming: false, pushNotifications: false }, defaultInputModes: ['text/plain'], defaultOutputModes: ['application/json'],
    securitySchemes: { opcodeBearer: { type: 'http', scheme: 'bearer' } }, security: [{ opcodeBearer: [] }],
    skills: [{ id: 'hire', name: 'Hire an agent', description: 'Describe a task; PAX picks an agent and opens an escrowed job.', tags: ['axp'] },
      { id: 'trade', name: 'Trade agent tokens', description: 'Buy or sell agent tokens on the curve.', tags: ['tokens'] },
      { id: 'launch', name: 'Launch an agent token', description: 'Asks for the missing details and launches.', tags: ['launch'] }],
    'opcode.axp': { directory: `${base}/v1/agents`, cards: Object.keys(ctx.store.state.agents).map((id) => `${base}/v1/agents/${id}/agent-card.json`) } };
}

/* ---------------- messaging: A2A JSON-RPC → AXP jobs ---------------- */
const STATE: Record<C.Phase, string> = { open: 'submitted', budget_set: 'input-required', funded: 'working', submitted: 'input-required', completed: 'completed', rejected: 'rejected', expired: 'failed' };
export function taskOf(j: JobRec) {
  return { kind: 'task', id: j.id, contextId: `axp-${j.id}`, status: { state: STATE[j.phase], timestamp: new Date(j.history.at(-1)!.at).toISOString(),
      message: { role: 'agent', parts: [{ kind: 'text', text: j.phase === 'budget_set' ? `Price set: ${C.fmtUsdc(j.price)} USDC. Fund the escrow to start.` : j.phase === 'submitted' ? 'Delivered. Approve or reject.' : `AXP phase: ${j.phase}` }] } },
    artifacts: j.deliverable ? [{ artifactId: `deliverable-${j.id}`, name: 'deliverable', parts: [{ kind: 'text', text: j.deliverable }] }] : [],
    metadata: { 'opcode.axp': { jobId: j.id, phase: j.phase, provider: j.provider, offering: j.offering, price: j.price, principal: j.principal, client: j.client, actions: { fund: `/v1/jobs/${j.id}/fund`, complete: `/v1/jobs/${j.id}/complete`, reject: `/v1/jobs/${j.id}/reject` } } } };
}
const rpcErr = (id: unknown, code: number, message: string, data?: unknown) => new Raw(200, { jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data ? { data } : {}) } });
const rpcOk = (id: unknown, result: unknown) => new Raw(200, { jsonrpc: '2.0', id: id ?? null, result: C.toJSON(result) });

export async function a2aRpc(ctx: Ctx, q: Req) {
  const b = q.body ?? {}, id = b.id, agent = ctx.store.state.agents[q.params.id!];
  if (b.jsonrpc !== '2.0' || typeof b.method !== 'string') return rpcErr(id, -32600, 'Invalid Request');
  if (!agent) return rpcErr(id, -32001, 'Agent not found');
  if (!q.user) return rpcErr(id, -32000, 'Unauthorized: sign in or use an agent key', { code: 'UNAUTHORIZED' });
  try {
    switch (b.method) {
      case 'SendMessage': case 'message/send': {
        const parts: any[] = b.params?.message?.parts ?? [];
        const data = parts.find((p) => p.kind === 'data' || p.data)?.data ?? {};
        const text = parts.filter((p) => p.kind === 'text' || typeof p.text === 'string').map((p) => p.text).join('\n').trim();
        const off = agent.offerings.find((o) => o.key === data.offering) ?? (agent.offerings.length === 1 || text ? agent.offerings[0] : undefined);
        if (!off) return rpcErr(id, -32602, `Choose a skill: ${agent.offerings.map((o) => o.key).join(', ')}`);
        const reqs: Record<string, string> = { ...(data.requirements ?? {}) };
        if (text && off.requirements[0] && !reqs[off.requirements[0][0]]) reqs[off.requirements[0][0]] = text;
        const job = await openJob(ctx, q.user, { agentId: agent.id, offering: off.key, requirements: reqs, evaluator: data.evaluator ?? null, principal: data.principal ? C.usdc(String(data.principal)) : 0n, payFrom: 'wallet' });
        return rpcOk(id, taskOf(job as JobRec));
      }
      case 'GetTask': case 'tasks/get': {
        const j = ctx.store.state.jobs[String(b.params?.id ?? '')];
        if (!j || j.provider !== agent.id) return rpcErr(id, -32001, 'Task not found');
        if (j.client !== q.user && agent.owner !== q.user && agent.wallet !== q.user) return rpcErr(id, -32001, 'Task not found');
        return rpcOk(id, taskOf(j));
      }
      case 'CancelTask': case 'tasks/cancel': {
        const j = getJob(ctx, String(b.params?.id ?? ''));
        const by = j.client === q.user ? q.user : providerActor(ctx, q.user, j.id);
        const out = await act(ctx, q.user, j.id, { type: 'reject', by, reason: 'canceled' });
        return rpcOk(id, taskOf(out as JobRec));
      }
      default: return rpcErr(id, -32601, 'Method not found');
    }
  } catch (e) {
    if (e instanceof DomainError) return rpcErr(id, e.status === 404 ? -32001 : -32000, e.message, { code: e.code });
    throw e;
  }
}

/* ---------------- payment: x402 per call ---------------- */
export async function paidCall(ctx: Ctx, q: Req) {
  const a = getAgent(ctx, q.params.id!), o = a.offerings.find((x) => x.key === q.params.offering);
  if (!o) throw new DomainError('NOT_FOUND', 'Offering not found.', 404);
  if (!o.x402) throw new DomainError('NOT_X402', 'This offering is sold as an escrowed job. Use /v1/jobs or A2A SendMessage.', 409);
  const reqs: Record<string, string> = q.body?.requirements ?? {};
  const missing = C.missingRequirements(o.requirements, reqs);
  if (missing.length) throw new DomainError('MISSING_INPUTS', `Missing: ${missing.map((m) => m[1]).join(', ')}.`, 422);
  const req = X.requirements({ amount: o.price, payTo: ctx.cfg.x402.payTo as `0x${string}`, asset: ARC_MAINNET.usdc, tokenName: ctx.cfg.x402.tokenName, tokenVersion: ctx.cfg.x402.tokenVersion });
  const resource = { url: `${ctx.cfg.publicUrl.replace(/\/$/, '')}${q.path}`, description: `${a.name}: ${o.name}`, mimeType: 'application/json' };
  const header = (q.headers['payment-signature'] ?? q.headers['x-payment']) as string | undefined;
  if (!header) { const pr = X.paymentRequired(resource, [req], 'payment_required'); return new Raw(402, pr, { [X.HEADERS.required]: X.encodeHeader(pr) }); }
  // 95% to the agent wallet, 5% protocol. On Arc the PaymentSplitter contract does this split.
  const fee = C.bps(o.price, C.AXP_PROTOCOL_BPS);
  const settle = await ctx.x402.settle(X.decodeHeader<C.x402.PaymentPayload>(header), req, ctx.chain.mode === 'sim'
    ? [{ asset: 'USDC', from: req.payTo, to: a.wallet, amount: o.price - fee }, { asset: 'USDC', from: req.payTo, to: 'protocol', amount: fee }] : []);
  if (!settle.success) { const pr = X.paymentRequired(resource, [req], settle.errorReason); return new Raw(402, pr, { [X.HEADERS.required]: X.encodeHeader(pr) }); }
  const callId = ctx.store.nextId('x');
  let output: string | null = null;
  if (!a.owner.startsWith('0x') && ctx.cfg.chainMode === 'sim') output = simulatedDeliverable(o.key, reqs);
  else if (ctx.runtime.invoke) output = await ctx.runtime.invoke({ id: callId, offering: o.key, requirements: reqs, payer: settle.payer, amount: req.amount, tx: settle.transaction }, a).catch(() => null);
  ctx.store.state.calls.unshift({ id: callId, agentId: a.id, offering: o.key, payer: lc(settle.payer), amount: o.price, tx: settle.transaction, at: ctx.now(), output, rail: 'x402' });
  a.stats.jobs++; a.stats.completed++; a.stats.revenue += o.price;
  if (a.owner.startsWith('0x')) notify(ctx, a.owner, 'x402', `${a.name} was paid ${C.fmtUsdc(o.price)} USDC for ${o.key} (x402).`);
  const enc = X.encodeHeader(settle);
  return new Raw(200, { callId, agentId: a.id, offering: o.key, status: output === null ? 'accepted' : 'completed', output, receipt: settle }, { [X.HEADERS.response]: enc, [X.HEADERS.v1Response]: enc });
}
