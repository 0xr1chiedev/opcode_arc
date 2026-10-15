import { validateTokenomics, type Tokenomics } from './tokenomics.ts';
import { validateSniper, type SniperSide } from './sniper.ts';
import { validatePresaleConfig, type PresaleConfig } from './presale.ts';
import { MODULE_FEES } from './fees.ts';

/** Everything needed to launch an agent token. The API validates it, the chain layer executes it. */
export interface LaunchSpec {
  type: 'standard' | 'presale';
  name: string; symbol: string; description: string; agentId: string | null;
  links?: { x?: string; website?: string };
  tokenomics: Tokenomics;
  modules: { capitalFormation: boolean; launchRadar: boolean; sixtyDays: boolean };
  sniper: { windowSec: number; side: SniperSide };
  startTs: number;                 // standard: when trading opens; presale: when the presale opens
  prebuy: bigint;                  // standard only, USDC
  presale?: Omit<PresaleConfig, 'startTs' | 'endTs'> & { durationH: number };
}

export const SYMBOL_RE = /^[A-Z0-9]{2,8}$/;

export function validateLaunch(s: LaunchSpec, ctx: { now: number; symbolTaken: (sym: string) => boolean }): string[] {
  const e: string[] = [];
  const name = s.name.trim();
  if (name.length < 2 || name.length > 32) e.push('Use 2 to 32 characters for the name.');
  if (!SYMBOL_RE.test(s.symbol)) e.push('A ticker is 2 to 8 capital letters or numbers.');
  else if (ctx.symbolTaken(s.symbol)) e.push(`$${s.symbol} is taken.`);
  if (s.description.length > 400) e.push('Keep the description under 400 characters.');
  e.push(...validateTokenomics(s.tokenomics, { presale: s.type === 'presale' }));
  if (s.startTs < ctx.now - 60_000) e.push('The start time is in the past.');
  if (s.startTs > ctx.now + 30 * 86_400_000) e.push('Schedule within the next 30 days.');
  if (s.type === 'standard') {
    const sn = validateSniper(s.sniper); if (sn) e.push(sn);
    if (s.prebuy < 0n) e.push('Pre-buy cannot be negative.');
    if (!s.modules.capitalFormation) e.push('Standard launches need Capital Formation (the bonding curve).');
  } else {
    if (!s.presale) e.push('Presale settings are missing.');
    else {
      const p = s.presale;
      e.push(...validatePresaleConfig({ ...p, startTs: s.startTs, endTs: s.startTs + p.durationH * 3_600_000 }));
      if (BigInt(s.tokenomics.pct.presale) * 100n !== p.shareBps) e.push('Tokenomics presale share must match the presale settings.');
    }
    if (s.prebuy > 0n) e.push('Presale launches have no pre-buy.');
  }
  return e;
}

/** USDC charged at launch time (modules + pre-buy). Presale launches have no listing fee. */
export function launchCost(s: LaunchSpec): { modules: bigint; prebuy: bigint; total: bigint } {
  const modules = s.type === 'presale' ? 0n : (s.modules.capitalFormation ? MODULE_FEES.capitalFormation : 0n) + (s.modules.launchRadar ? MODULE_FEES.launchRadar : 0n);
  return { modules, prebuy: s.prebuy, total: modules + s.prebuy };
}
