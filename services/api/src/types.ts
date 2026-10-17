import type { CurveState, PoolState, SniperConfig, Tokenomics, Job, Commitment, Settlement, Submission, PointsBalance, LaunchSpec, LaunchDraft } from '../../../packages/core/src/index.ts';

export interface User { address: string; name: string | null; createdAt: number; x: { handle: string; userId: string; linkedAt: number } | null; points: PointsBalance }
export interface Session { token: string; address: string; expiresAt: number }
export interface Offering { key: string; name: string; description: string; price: bigint; pctFeeBps: number; slaMinutes: number; requirements: [string, string][]; fundTransfer: boolean; x402: boolean }
export interface AgentKey { id: string; hash: string; label: string; createdAt: number; lastUsedAt: number | null }
export interface Agent { id: string; name: string; handle: string; owner: string; wallet: string; keys: AgentKey[]; description: string; category: string; endpoint: string | null; secret: string | null; offerings: Offering[]; stats: { jobs: number; completed: number; rejected: number; revenue: bigint }; symbol: string | null; createdAt: number }
export interface TokenRec {
  symbol: string; name: string; description: string; category: string; agentId: string | null; creator: string; createdAt: number;
  tokenomics: Tokenomics; curveTokens: bigint; curve: CurveState; pool: PoolState | null; sniper: SniperConfig | null;
  volume: bigint; fees: { creator: bigint; treasury: bigint }; holders: Record<string, true>; launchId: string | null; graduatedAt: number | null;
}
export interface TradeRec { id: string; symbol: string; trader: string; side: 'buy' | 'sell'; usdc: bigint; tokens: bigint; fee: bigint; buyback: bigint; priceWad: bigint; at: number; txHash: string }
export interface LaunchRec { id: string; symbol: string; type: 'standard' | 'presale'; spec: LaunchSpec; creator: string; status: 'scheduled' | 'presale' | 'live' | 'cancelled'; createdAt: number; presaleId: string | null }
export interface PresaleRec { id: string; symbol: string; launchId: string; target: bigint; capPerWallet: bigint; shareBps: bigint; minPoints: bigint; startTs: number; endTs: number; commitments: Record<string, Commitment>; settlement: Settlement | null; settledAt: number | null }
export interface JobRec extends Job { payer: string; txs: string[] }
export interface Notice { id: string; address: string; kind: string; text: string; at: number; read: boolean }
export interface ChatMsg { role: 'user' | 'pax'; text: string; options?: string[]; card?: Record<string, unknown>; at: number }
export interface Chat { id: string; owner: string; title: string; messages: ChatMsg[]; draft: LaunchDraft | null; createdAt: number }
export interface CallRec { id: string; agentId: string; offering: string; payer: string; amount: bigint; tx: string; at: number; output: string | null; rail: 'x402' }
export interface SubmissionRec extends Submission { trackUntil: number; credited: bigint }

export interface State {
  seq: number;
  users: Record<string, User>; sessions: Record<string, Session>; nonces: Record<string, { nonce: string; issuedAt: number }>;
  agents: Record<string, Agent>; jobs: Record<string, JobRec>; tokens: Record<string, TokenRec>; trades: TradeRec[];
  launches: Record<string, LaunchRec>; presales: Record<string, PresaleRec>; submissions: SubmissionRec[]; notices: Notice[]; chats: Record<string, Chat>;
  calls: CallRec[]; x402Nonces: Record<string, number>;
}
export const emptyState = (): State => ({ seq: 1000, users: {}, sessions: {}, nonces: {}, agents: {}, jobs: {}, tokens: {}, trades: [], launches: {}, presales: {}, submissions: [], notices: [], chats: {}, calls: [], x402Nonces: {} });
