import * as C from '../../../../packages/core/src/index.ts';
import { ACCT } from '../../../../packages/chain/src/index.ts';
import { lc, type Ctx } from '../ctx.ts';
import type { Chat, ChatMsg } from '../types.ts';
import { getToken, quote, symbolTaken } from './market.ts';
import { searchOfferings } from './jobs.ts';
import { createLaunch } from './launch.ts';

const { DomainError } = C;

/**
 * PAX conversation engine. It never moves money by itself: it answers with text, suggested replies and cards
 * (trade, transfer, pick an agent, launch review). The client executes a card through the matching endpoint,
 * so every action still needs the user's approval and, on Arc, the user's signature.
 */
export function getChat(ctx: Ctx, user: string, id?: string | null): Chat {
  const s = ctx.store.state;
  if (id) { const c = s.chats[id]; if (!c || c.owner !== lc(user)) throw new DomainError('NOT_FOUND', 'Chat not found.', 404); return c; }
  const cid = ctx.store.nextId('c'); return (s.chats[cid] = { id: cid, owner: lc(user), title: 'New chat', messages: [], draft: null, createdAt: ctx.now() });
}

async function launchCtx(ctx: Ctx, user: string): Promise<C.LaunchCtx> {
  const agents = Object.values(ctx.store.state.agents).filter((a) => a.owner === lc(user)).map((a) => ({ id: a.id, name: a.name, description: a.description }));
  const wallet = await ctx.chain.balanceOf('USDC', lc(user)).catch(() => 10n ** 15n);
  return { agents, symbolTaken: (x) => symbolTaken(ctx, x), walletUsdc: wallet, now: ctx.now() };
}

const say = (ctx: Ctx, text: string, extra: Partial<ChatMsg> = {}): ChatMsg => ({ role: 'pax', text, at: ctx.now(), ...extra });

async function launchStep(ctx: Ctx, chat: Chat, lctx: C.LaunchCtx): Promise<ChatMsg> {
  const q = C.nextQuestion(chat.draft!, lctx);
  if (q) return say(ctx, q.ask(chat.draft!, lctx), { options: q.options(chat.draft!, lctx), card: { type: 'launch_question', key: q.key, label: q.label, step: C.activeQuestions(chat.draft!, lctx).indexOf(q) + 1, of: C.activeQuestions(chat.draft!, lctx).length } });
  const spec = C.draftToSpec(chat.draft!, ctx.now());
  return say(ctx, 'Here is the launch. Edit the name, ticker or description, or confirm to launch.', { card: { type: 'launch_review', spec, cost: C.launchCost(spec) } });
}

export async function message(ctx: Ctx, user: string, chatId: string | null, text: string) {
  const chat = getChat(ctx, user, chatId), t = String(text ?? '').trim();
  if (!t) throw new DomainError('BAD_INPUT', 'Say something.');
  if (!chat.messages.length) chat.title = t.length > 40 ? t.slice(0, 38) + '…' : t;
  chat.messages.push({ role: 'user', text: t, at: ctx.now() });
  const replies: ChatMsg[] = [];
  if (chat.draft) {
    const lctx = await launchCtx(ctx, user);
    if (/^(cancel|stop)$/i.test(t)) { chat.draft = null; replies.push(say(ctx, 'Okay, launch cancelled. Nothing was created.')); }
    else {
      const r = C.answer(chat.draft, t, lctx);
      if (!r.ok) replies.push(say(ctx, r.error, { options: r.question.options(chat.draft, lctx), card: { type: 'launch_question', key: r.question.key, label: r.question.label, error: true } }));
      else replies.push(await launchStep(ctx, chat, lctx));
    }
  } else {
    const intent = C.parseIntent(t, { symbols: Object.keys(ctx.store.state.tokens) });
    switch (intent.kind) {
      case 'launch': {
        const lctx = await launchCtx(ctx, user); chat.draft = C.prefillDraft(intent.text, lctx);
        replies.push(say(ctx, "Let's launch your agent token. I'll ask a few short questions and show you everything before anything is created."));
        replies.push(await launchStep(ctx, chat, lctx)); break;
      }
      case 'buy': case 'sell': {
        const tok = getToken(ctx, intent.symbol);
        const amt = intent.kind === 'buy' ? intent.usdc : ((await ctx.chain.balanceOf(`token:${tok.symbol}`, ACCT.pax(user)).catch(() => 0n)) * BigInt(intent.pct)) / 100n;
        if (amt <= 0n) { replies.push(say(ctx, `Your PAX wallet holds no $${tok.symbol}.`)); break; }
        const q = quote(ctx, tok, intent.kind, amt);
        replies.push(say(ctx, `${intent.kind === 'buy' ? 'Buy' : 'Sell'} $${tok.symbol} from your PAX wallet. Edit the amount if you like.`, { card: { type: 'trade', symbol: tok.symbol, side: intent.kind, amount: amt, out: q.out, taxBps: q.tax.taxBps, from: 'pax' } })); break;
      }
      case 'deposit': replies.push(say(ctx, 'Move USDC from your wallet into your PAX wallet?', { card: { type: 'transfer', dir: 'in', amount: intent.usdc } })); break;
      case 'withdraw': { const bal = await ctx.chain.balanceOf('USDC', ACCT.pax(user)).catch(() => 0n); replies.push(say(ctx, 'Move USDC from PAX back to your wallet?', { card: { type: 'transfer', dir: 'out', amount: intent.usdc ?? bal } })); break; }
      case 'perp': {
        const r = searchOfferings(ctx, 'perp_execute', 1)[0];
        if (!r) { replies.push(say(ctx, 'No perp agent is available right now.')); break; }
        replies.push(say(ctx, `For perps I use ${r.agent.name}: your margin goes into escrow and the agent opens the position with a stop.`, { card: { type: 'pick', results: [{ agentId: r.agent.id, offering: r.offering.key, price: r.offering.price, pctFeeBps: r.offering.pctFeeBps, slaMinutes: r.offering.slaMinutes, prefill: { market: intent.market, side: intent.side, margin: intent.margin ? C.fmtUsdc(intent.margin) : '', leverage: intent.leverage ? String(intent.leverage) : '' } }] } })); break;
      }
      case 'jobs': { const mine = Object.values(ctx.store.state.jobs).filter((j) => j.client === lc(user)).slice(-6).reverse(); replies.push(say(ctx, mine.length ? 'Your recent jobs:' : 'No jobs yet. Tell me what you need and I will find an agent.', { card: { type: 'jobs', jobs: mine.map((j) => ({ id: j.id, provider: j.provider, offering: j.offering, phase: j.phase, price: j.price })) } })); break; }
      case 'balance': {
        const [w, p] = await Promise.all([ctx.chain.balanceOf('USDC', lc(user)).catch(() => null), ctx.chain.balanceOf('USDC', ACCT.pax(user)).catch(() => null)]);
        replies.push(say(ctx, `PAX wallet ${p == null ? 'n/a' : C.fmtUsdc(p, 2)} USDC · main wallet ${w == null ? 'n/a' : C.fmtUsdc(w, 2)} USDC.`)); break;
      }
      case 'create_agent': replies.push(say(ctx, 'Create an agent with POST /v1/agents, or use the agent builder in the app.')); break;
      case 'hire': {
        const res = searchOfferings(ctx, intent.query, 3);
        replies.push(res.length ? say(ctx, `I found ${res.length} agent${res.length > 1 ? 's' : ''} for this.`, { card: { type: 'pick', results: res.map((r) => ({ agentId: r.agent.id, offering: r.offering.key, description: r.offering.description, price: r.offering.price, pctFeeBps: r.offering.pctFeeBps, slaMinutes: r.offering.slaMinutes, requirements: r.offering.requirements, success: r.agent.stats.jobs ? r.agent.stats.completed / r.agent.stats.jobs : null })) } })
          : say(ctx, 'I could not find an agent for that yet. Describe the outcome you want, for example "audit my contract".')); break;
      }
    }
  }
  chat.messages.push(...replies);
  return { chatId: chat.id, replies };
}

export async function confirmLaunch(ctx: Ctx, user: string, chatId: string, edits: { name?: string; symbol?: string; description?: string } = {}) {
  const chat = getChat(ctx, user, chatId), lctx = await launchCtx(ctx, user);
  if (!chat.draft || C.nextQuestion(chat.draft, lctx)) throw new DomainError('NO_DRAFT', 'There is no finished launch in this chat.', 409);
  Object.assign(chat.draft, Object.fromEntries(Object.entries({ name: edits.name, symbol: edits.symbol?.toUpperCase(), description: edits.description }).filter(([, v]) => v)));
  const out = await createLaunch(ctx, user, C.draftToSpec(chat.draft, ctx.now()));
  chat.draft = null;
  chat.messages.push(say(ctx, 'Launch created.', { card: { type: 'launch_done', result: out } }));
  return out;
}
