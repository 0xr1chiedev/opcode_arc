import * as C from '../../../packages/core/src/index.ts';
import { SimChain } from '../../../packages/chain/src/index.ts';
import type { Ctx } from './ctx.ts';
import type { Agent, Offering } from './types.ts';
import { createToken, trade } from './services/market.ts';
import { createLaunch } from './services/launch.ts';
import { ensureUser } from './auth.ts';
import { deriveAgentWallet } from './services/agents.ts';

const O = (key: string, name: string, description: string, price: string, slaMinutes: number, requirements: [string, string][], extra: Partial<Offering> = {}): Offering =>
  ({ key, name, description, price: C.usdc(price), pctFeeBps: 0, slaMinutes, requirements, fundTransfer: false, x402: false, ...extra });

/** Platform agents mirror the preview's catalogue. */
export const SEED_AGENTS: Omit<Agent, 'stats' | 'createdAt' | 'symbol' | 'wallet' | 'keys'>[] = [
  { id: 'lumen', name: 'Lumen', handle: 'lumen', owner: 'protocol', category: 'Productivity', endpoint: null, secret: null, description: 'Reads contracts in Turkish and English and returns a plain summary with risks.', offerings: [O('contract_summary', 'Contract summary', 'Plain-language summary of a contract with flagged risks.', '0.5', 5, [['document', 'Contract text or link'], ['language', 'Language of the summary']]), O('nda_check', 'NDA check', 'Checks an NDA for one-sided clauses.', '0.3', 3, [['document', 'NDA text or link']], { x402: true })] },
  { id: 'vera', name: 'Vera', handle: 'vera', owner: 'protocol', category: 'Infra', endpoint: null, secret: null, description: 'Security reviewer for Solidity contracts and new tokens.', offerings: [O('solidity_review', 'Solidity review', 'Audit of a Solidity contract with findings and fixes.', '4', 40, [['repo', 'Repository or file link'], ['scope', 'Contracts in scope']]), O('token_rug_check', 'Token rug check', 'Checks a token for rug patterns.', '0.2', 2, [['token', 'Token address']], { x402: true })] },
  { id: 'orca', name: 'Orca', handle: 'orca', owner: 'protocol', category: 'DeFi', endpoint: null, secret: null, description: 'Market desk: signals and perp execution with a stop attached.', offerings: [O('signal_snapshot', 'Signal snapshot', 'Trend, key levels and a bias for BTC, ETH, SOL or HYPE.', '0.3', 1, [['market', 'Market'], ['horizon', 'Horizon']], { x402: true }), O('perp_execute', 'Perp execution', 'Opens a perp position from escrowed margin with a stop.', '0', 2, [['market', 'Market'], ['side', 'Long or short'], ['margin', 'Margin (USDC)'], ['leverage', 'Leverage']], { pctFeeBps: 20, fundTransfer: true })] },
  { id: 'scout', name: 'Scout', handle: 'scout', owner: 'protocol', category: 'Research', endpoint: null, secret: null, description: 'Research analyst. Sourced market and competitor reports.', offerings: [O('research_report', 'Research report', 'Market or company report with 6+ sources and a recommendation.', '3', 20, [['topic', 'Topic or company'], ['depth', 'Depth']]), O('alpha_ping', 'Alpha ping', 'Latest headlines for a keyword with one action and one risk.', '0.05', 1, [['keyword', 'Keyword']], { x402: true })] },
  { id: 'pixl', name: 'Pixel Atelier', handle: 'pixl', owner: 'protocol', category: 'Creative', endpoint: null, secret: null, description: 'Brand designer: logos, palettes and social templates.', offerings: [O('brand_kit', 'Brand kit', 'Logo, palette, type and three social templates.', '6', 60, [['brand', 'Brand name'], ['style', 'Style notes']])] },
  { id: 'courier', name: 'Courier', handle: 'courier', owner: 'protocol', category: 'Robotics', endpoint: null, secret: null, description: 'Route planner for delivery robots and couriers.', offerings: [O('route_plan', 'Route plan', 'Optimised multi-stop route with ETAs.', '0.02', 1, [['stops', 'Stops'], ['vehicle', 'Vehicle type']], { x402: true })] },
  { id: 'nova', name: 'Nova Translate', handle: 'nova', owner: 'protocol', category: 'Productivity', endpoint: null, secret: null, description: 'Translates documents between 40 languages.', offerings: [O('translation', 'Document translation', 'Translates a document and keeps its formatting.', '1', 10, [['document', 'Document'], ['target', 'Target language']])] },
];

export async function seed(ctx: Ctx) {
  const s = ctx.store.state;
  for (const a of SEED_AGENTS) s.agents[a.id] ??= { ...a, wallet: deriveAgentWallet(a.id), keys: [], stats: { jobs: 0, completed: 0, rejected: 0, revenue: 0n }, symbol: null, createdAt: ctx.now() };
  if (!(ctx.chain instanceof SimChain) || Object.keys(s.tokens).length) return;
  // Sample market on the simulated chain: a few live tokens with trading history, one scheduled launch and one presale.
  const trader = '0x000000000000000000000000000000000000beef', creator = '0x000000000000000000000000000000000000c0de';
  ctx.chain.mint('USDC', trader, C.usdc('500000')); ctx.chain.mint('USDC', creator, C.usdc('1000'));
  const mk = async (symbol: string, name: string, agentId: string | null, category: string, buys: string[]) => {
    const t = await createToken(ctx, { symbol, name, description: `${name} agent token.`, category, agentId, creator, tokenomics: C.defaultTokenomics('balanced'), sniper: null, launchId: null });
    for (const b of buys) await trade(ctx, trader, symbol, 'buy', C.usdc(b), undefined);
    return t;
  };
  await mk('LUMEN', 'Lumen', 'lumen', 'Productivity', ['5000', '9000', '12000']);
  await mk('VERA', 'Vera', 'vera', 'Infra', ['8000', '14000', '9000']);
  await mk('ORCA', 'Orca', 'orca', 'DeFi', ['20000', '25000']);
  await mk('SCOUT', 'Scout', 'scout', 'Research', ['3000', '6000']);
  ensureUser(ctx, creator);
  await createLaunch(ctx, creator, { type: 'standard', name: 'Navi Maps', symbol: 'NAVI', description: 'Route and dock planning for delivery robots.', agentId: null, tokenomics: C.defaultTokenomics('balanced'), modules: { capitalFormation: true, launchRadar: false, sixtyDays: false }, sniper: { windowSec: 600, side: 'buy' }, startTs: ctx.now() + 42 * 60_000, prebuy: 0n });
  await createLaunch(ctx, creator, { type: 'presale', name: 'Atlas Research', symbol: 'ATLX', description: 'Sourced market reports.', agentId: null, tokenomics: C.defaultTokenomics('balanced', 20), modules: { capitalFormation: true, launchRadar: false, sixtyDays: false }, sniper: { windowSec: 0, side: 'buy' }, startTs: ctx.now(), prebuy: 0n, presale: { target: C.usdc('20000'), capPerWallet: C.usdc('420'), shareBps: 2_000n, minPoints: 100n, durationH: 48 } });
}
