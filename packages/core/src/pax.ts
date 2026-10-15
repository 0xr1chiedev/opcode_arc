import { ONE_USDC, usdc } from './money.ts';
import { defaultTokenomics, type Tokenomics } from './tokenomics.ts';
import { defaultCap } from './presale.ts';
import type { LaunchSpec } from './launch.ts';

/**
 * PAX intent routing and the launch assistant.
 * This rule-based parser is the default brain; an LLM planner can replace `parseIntent` behind the same types.
 */
export type Intent =
  | { kind: 'launch'; text: string }
  | { kind: 'buy'; symbol: string; usdc: bigint }
  | { kind: 'sell'; symbol: string; pct: number }
  | { kind: 'deposit'; usdc: bigint }
  | { kind: 'withdraw'; usdc: bigint | null }
  | { kind: 'perp'; market: string; side: 'long' | 'short'; margin: bigint | null; leverage: number | null }
  | { kind: 'jobs' } | { kind: 'balance' } | { kind: 'create_agent' }
  | { kind: 'hire'; query: string };

const num = (q: string, re: RegExp) => { const m = q.match(re); return m ? Number(m[1]!.replace(/,/g, '')) : null; };
const toUsdc = (n: number | null, d: number) => usdc((n ?? d).toFixed(6));
export const MARKETS = ['BTC', 'ETH', 'SOL', 'HYPE'] as const;

export function parseIntent(text: string, ctx: { symbols: string[] }): Intent {
  const q = text.trim(), lq = q.toLowerCase();
  if ((/\b(launch|create|deploy|mint|make|start)\b/.test(lq) && /\b(token|coin|presale)\b/.test(lq)) || /\blaunch\s+\$[a-z0-9]/i.test(q)) return { kind: 'launch', text: q };
  if (/\b(deposit|top ?up|fund)\b/.test(lq) && !/\bjob\b/.test(lq)) return { kind: 'deposit', usdc: toUsdc(num(q, /([\d,]*\.?\d+)/), 50) };
  if (/\bwithdraw\b/.test(lq)) { const n = num(q, /([\d,]*\.?\d+)/); return { kind: 'withdraw', usdc: n == null ? null : toUsdc(n, 0) }; }
  const sym = ctx.symbols.find((s) => new RegExp(`\\b\\$?${s}\\b`, 'i').test(q));
  if (sym && /\b(buy|purchase|ape)\b/.test(lq)) return { kind: 'buy', symbol: sym, usdc: toUsdc(num(q, /([\d,]*\.?\d+)\s*(?:usdc|usd|\$)/i) ?? num(q, /\$\s*([\d,]*\.?\d+)/) ?? num(q, /([\d,]*\.?\d+)/), 20) };
  if (sym && /\bsell\b/.test(lq)) return { kind: 'sell', symbol: sym, pct: /\ball\b/.test(lq) ? 100 : Math.min(100, num(q, /(\d+)\s*%/) ?? 50) };
  const mk = MARKETS.find((m) => new RegExp(`\\b${m}\\b`, 'i').test(q));
  if (mk && /\b(long|short)\b/.test(lq)) { const m = num(q, /([\d,]*\.?\d+)\s*(?:usdc|usd)\b/i) ?? num(q, /\$\s*([\d,]*\.?\d+)/); return { kind: 'perp', market: mk, side: /\bshort\b/.test(lq) ? 'short' : 'long', margin: m == null ? null : toUsdc(m, 0), leverage: num(q, /(\d+)\s*x\b/i) }; }
  if (/\bjobs?\b/.test(lq) && /\b(show|list|my|status)\b/.test(lq)) return { kind: 'jobs' };
  if (/\b(balance|wallet)\b/.test(lq)) return { kind: 'balance' };
  if (/\b(create|build|make|launch)\b/.test(lq) && /\bagent\b/.test(lq)) return { kind: 'create_agent' };
  return { kind: 'hire', query: q };
}

/* ---------------- launch assistant ---------------- */
export interface LaunchCtx { agents: { id: string; name: string; description: string }[]; symbolTaken: (s: string) => boolean; walletUsdc: bigint; now: number }
export interface LaunchDraft {
  agentId?: string | null; name?: string; symbol?: string; description?: string; type?: 'standard' | 'presale';
  raise?: bigint; cap?: bigint; sharePct?: number; durationH?: number;
  sniperSec?: number; startInH?: number; prebuy?: bigint;
  split?: 'balanced' | 'fair' | 'community' | 'custom'; teamPct?: number; airdropPct?: number;
}
export interface Question { key: keyof LaunchDraft; label: string; ask: (d: LaunchDraft, c: LaunchCtx) => string; options: (d: LaunchDraft, c: LaunchCtx) => string[]; when?: (d: LaunchDraft, c: LaunchCtx) => boolean; parse: (a: string, d: LaunchDraft, c: LaunchCtx) => string | true }

export const parseAmount = (s: string): number | null => { const m = String(s).replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k|m)?\b/i); if (!m) return null; return Number(m[1]) * (m[2] ? (m[2].toLowerCase() === 'k' ? 1e3 : 1e6) : 1); };
export function suggestSymbol(name: string, taken: (s: string) => boolean): string {
  const s = String(name || 'TOKEN').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5) || 'TKN';
  let t = s, i = 2; while (taken(t)) t = s.slice(0, 4) + i++; return t;
}

export const QUESTIONS: Question[] = [
  { key: 'agentId', label: 'Agent', when: (_d, c) => c.agents.length > 0, ask: () => 'Which of your agents is this token for?', options: (_d, c) => [...c.agents.map((a) => a.name), 'No agent'],
    parse: (a, d, c) => { if (/^(no|none|token only|skip)\b/i.test(a.trim())) { d.agentId = null; return true; } const g = c.agents.find((x) => a.toLowerCase().includes(x.name.toLowerCase()) || a.toLowerCase().includes(x.id)); if (!g) return 'Pick one of your agents or say "No agent".'; d.agentId = g.id; return true; } },
  { key: 'name', label: 'Name', ask: () => 'What should the token be called?', options: (d, c) => { const g = c.agents.find((x) => x.id === d.agentId); return g ? [g.name] : []; },
    parse: (a, d) => { const n = a.trim().replace(/^["“']|["”']$/g, ''); if (n.length < 2 || n.length > 32) return 'Use 2 to 32 characters for the name.'; d.name = n; return true; } },
  { key: 'symbol', label: 'Ticker', ask: () => 'Ticker?', options: (d, c) => [suggestSymbol(d.name ?? '', c.symbolTaken)],
    parse: (a, d, c) => { const s = a.replace(/^\$/, '').trim().toUpperCase(); if (!/^[A-Z0-9]{2,8}$/.test(s)) return 'A ticker is 2 to 8 letters or numbers, like LUMEN.'; if (c.symbolTaken(s)) return `$${s} is taken. Try another one.`; d.symbol = s; return true; } },
  { key: 'description', label: 'Description', ask: () => 'In one sentence, what does it do?', options: (d, c) => (c.agents.some((x) => x.id === d.agentId) ? ['Use the agent description'] : []),
    parse: (a, d, c) => { const g = c.agents.find((x) => x.id === d.agentId); if (/use the agent/i.test(a) && g) { d.description = g.description; return true; } if (a.trim().length < 8) return 'Give me a short sentence, a few words at least.'; d.description = a.trim(); return true; } },
  { key: 'type', label: 'Launch type', ask: () => 'Standard launch or presale?', options: () => ['Standard launch', 'Presale'],
    parse: (a, d) => { if (/pre ?sale/i.test(a)) d.type = 'presale'; else if (/standard|normal|fair|direct|regular/i.test(a)) d.type = 'standard'; else return 'Say "standard" or "presale".'; return true; } },
  { key: 'raise', label: 'Raise', when: (d) => d.type === 'presale', ask: () => 'How much should the presale raise?', options: () => ['10,000 USDC', '20,000 USDC', '50,000 USDC'],
    parse: (a, d) => { const v = parseAmount(a); if (!v || v < 1000 || v > 500000) return 'Pick an amount between 1,000 and 500,000 USDC.'; d.raise = BigInt(Math.round(v)) * ONE_USDC; d.cap = defaultCap(d.raise); return true; } },
  { key: 'sharePct', label: 'Presale share', when: (d) => d.type === 'presale', ask: () => 'What share of the supply goes to the presale?', options: () => ['10%', '15%', '20%', '25%', '30%'],
    parse: (a, d) => { const v = parseAmount(a); if (!v || v < 10 || v > 30) return 'Choose between 10% and 30%.'; d.sharePct = Math.round(v); return true; } },
  { key: 'durationH', label: 'Duration', when: (d) => d.type === 'presale', ask: () => 'How long should the presale run?', options: () => ['24 hours', '48 hours', '72 hours'],
    parse: (a, d) => { const v = parseAmount(a); if (v !== 24 && v !== 48 && v !== 72) return 'Choose 24, 48 or 72 hours.'; d.durationH = v; return true; } },
  { key: 'sniperSec', label: 'Anti-sniper', when: (d) => d.type === 'standard', ask: () => 'Anti-sniper protection?', options: () => ['10 minutes', '60 seconds', '98 minutes', 'Off'],
    parse: (a, d) => { if (/\b(off|no|none)\b/i.test(a)) d.sniperSec = 0; else if (/98/.test(a)) d.sniperSec = 5880; else if (/60|sec/i.test(a)) d.sniperSec = 60; else if (/10/.test(a)) d.sniperSec = 600; else return 'Pick a window or say "off".'; return true; } },
  { key: 'startInH', label: 'Launch time', when: (d) => d.type === 'standard', ask: () => 'When should it go live?', options: () => ['Right away', 'In 1 hour', 'In 6 hours', 'In 24 hours'],
    parse: (a, d) => { if (/now|right away|immediately|asap/i.test(a)) d.startInH = 0; else if (/tomorrow/i.test(a)) d.startInH = 24; else { const v = parseAmount(a); if (v == null || v > 72) return 'Say "right away" or a number of hours up to 72.'; d.startInH = v; } return true; } },
  { key: 'prebuy', label: 'Pre-buy', when: (d) => d.type === 'standard', ask: () => 'Pre-buy at the starting price?', options: () => ['No pre-buy', '25 USDC', '50 USDC', '100 USDC'],
    parse: (a, d, c) => { if (/^(no|none|skip)\b/i.test(a.trim())) { d.prebuy = 0n; return true; } const v = parseAmount(a); if (v == null) return 'Give an amount in USDC or say "no".'; const amt = usdc(v.toFixed(6)); if (amt + 10n * ONE_USDC > c.walletUsdc) return 'That is more than your wallet can cover after the 10 USDC launch fee.'; d.prebuy = amt; return true; } },
  { key: 'split', label: 'Tokenomics', ask: () => 'How should the supply be split?', options: () => ['Balanced: curve 60, team 15, airdrop 10', 'Fair launch: no team', 'Community heavy: airdrop 25', 'Custom'],
    parse: (a, d) => { if (/custom/i.test(a)) d.split = 'custom'; else if (/fair|no team/i.test(a)) d.split = 'fair'; else if (/community|airdrop 25/i.test(a)) d.split = 'community'; else if (/balanced|default|standard/i.test(a)) d.split = 'balanced'; else return 'Pick one of the options or say "custom".'; return true; } },
  { key: 'teamPct', label: 'Team share', when: (d) => d.split === 'custom', ask: () => 'Team share in percent? Up to 25%.', options: () => ['0%', '10%', '15%', '20%'],
    parse: (a, d) => { const v = parseAmount(a); if (v == null || v < 0 || v > 25) return 'Team share must be 0 to 25%.'; d.teamPct = Math.round(v); return true; } },
  { key: 'airdropPct', label: 'Airdrop', when: (d) => d.split === 'custom', ask: () => 'Airdrop share for point holders, in percent?', options: () => ['0%', '5%', '10%', '20%'],
    parse: (a, d) => { const v = parseAmount(a); if (v == null || v < 0) return 'Give a percentage.'; const curve = 90 - (d.teamPct ?? 0) - Math.round(v) - (d.type === 'presale' ? d.sharePct ?? 0 : 0); if (curve < 20) return `That leaves ${curve}% for the curve. Keep at least 20% there.`; d.airdropPct = Math.round(v); return true; } },
];

export const activeQuestions = (d: LaunchDraft, c: LaunchCtx) => QUESTIONS.filter((q) => !q.when || q.when(d, c));
export const nextQuestion = (d: LaunchDraft, c: LaunchCtx) => activeQuestions(d, c).find((q) => d[q.key] === undefined) ?? null;

export function prefillDraft(text: string, c: LaunchCtx): LaunchDraft {
  const d: LaunchDraft = {};
  if (/pre ?sale/i.test(text)) d.type = 'presale'; else if (/\b(standard|fair launch|no presale)\b/i.test(text)) d.type = 'standard';
  const sym = text.match(/\$([A-Za-z0-9]{2,8})\b/) || text.match(/\bticker\s+([A-Za-z0-9]{2,8})\b/i);
  if (sym) { const s = sym[1]!.toUpperCase(); if (!c.symbolTaken(s)) d.symbol = s; }
  const nm = text.match(/\b(?:called|named)\s+["“']?([A-Za-z0-9][A-Za-z0-9 .\-]{1,30}?)["”']?(?=\s+(?:with|ticker|for|and|as|on|in|raising|raise)\b|[,.$]|$)/i);
  if (nm) d.name = nm[1]!.trim();
  const ag = c.agents.find((a) => new RegExp(`\\b(${a.id}|${a.name.replace(/[^A-Za-z0-9 ]/g, '')})\\b`, 'i').test(text));
  if (ag) d.agentId = ag.id; else if (/\b(no agent|token only)\b/i.test(text)) d.agentId = null;
  const rs = text.match(/\braise\s+\$?([\d.,]+\s*k?)/i);
  if (rs && d.type !== 'standard') { const v = parseAmount(rs[1]!); if (v && v >= 1000) { d.type = 'presale'; d.raise = BigInt(Math.round(v)) * ONE_USDC; d.cap = defaultCap(d.raise); } }
  const sh = text.match(/(\d{2})\s*%\s*(?:of (?:the )?supply|presale)/i); if (sh && +sh[1]! >= 10 && +sh[1]! <= 30) d.sharePct = +sh[1]!;
  if (/\b(right away|now|immediately)\b/i.test(text)) d.startInH = 0; else { const w = text.match(/\bin\s+(\d{1,2})\s*h(?:ours?)?\b/i); if (w) d.startInH = +w[1]!; else if (/\btomorrow\b/i.test(text)) d.startInH = 24; }
  if (/\bno anti-?sniper\b/i.test(text)) d.sniperSec = 0;
  if (/\bfair launch\b/i.test(text)) d.split = 'fair';
  if (d.startInH !== undefined && !d.type) d.type = 'standard';
  return d;
}

export function answer(d: LaunchDraft, text: string, c: LaunchCtx): { ok: true; next: Question | null } | { ok: false; error: string; question: Question } {
  const q = nextQuestion(d, c); if (!q) return { ok: true, next: null };
  const r = q.parse(text, d, c);
  return r === true ? { ok: true, next: nextQuestion(d, c) } : { ok: false, error: r, question: q };
}

export function draftTokenomics(d: LaunchDraft): Tokenomics {
  const pre = d.type === 'presale' ? d.sharePct ?? 0 : 0;
  if (d.split === 'custom') { const t = defaultTokenomics('balanced', 0); t.pct = { presale: pre, curve: 90 - (d.teamPct ?? 0) - (d.airdropPct ?? 0) - pre, team: d.teamPct ?? 0, airdrop: d.airdropPct ?? 0, ecosystem: 5, treasury: 5 }; return t; }
  return defaultTokenomics(d.split ?? 'balanced', pre);
}

/** Turns a completed draft into a LaunchSpec. */
export function draftToSpec(d: LaunchDraft, now: number): LaunchSpec {
  if (nextQuestionKeysMissing(d)) throw new Error('Draft is incomplete.');
  const presale = d.type === 'presale';
  return {
    type: d.type!, name: d.name!, symbol: d.symbol!, description: d.description ?? '', agentId: d.agentId ?? null,
    tokenomics: draftTokenomics(d), modules: { capitalFormation: true, launchRadar: false, sixtyDays: false },
    sniper: { windowSec: presale ? 0 : d.sniperSec ?? 600, side: 'buy' }, startTs: now + (presale ? 0 : (d.startInH ?? 0) * 3_600_000), prebuy: presale ? 0n : d.prebuy ?? 0n,
    presale: presale ? { target: d.raise!, capPerWallet: d.cap ?? defaultCap(d.raise!), shareBps: BigInt(d.sharePct!) * 100n, minPoints: 100n, durationH: d.durationH! } : undefined,
  };
}
const nextQuestionKeysMissing = (d: LaunchDraft) => !d.type || !d.name || !d.symbol || (d.type === 'presale' && (!d.raise || !d.sharePct || !d.durationH));
