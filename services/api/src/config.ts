import { addressesFromEnv, ARC_MAINNET, type OpcodeAddresses } from '../../../packages/chain/src/index.ts';

export interface Config {
  port: number; chainMode: 'sim' | 'arc'; rpcUrl: string; addresses: OpcodeAddresses;
  allowDev: boolean; storeFile: string | null; seed: boolean; corsOrigin: string; sessionTtlMs: number; domain: string;
  x: { clientId?: string; clientSecret?: string; bearer?: string; redirectUri?: string; mode: 'mock' | 'api' };
  prices: 'dexscreener' | 'static'; workerMs: number;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const chainMode = env.CHAIN_MODE === 'arc' ? 'arc' : 'sim';
  return {
    port: Number(env.PORT ?? 8787), chainMode, rpcUrl: env.ARC_RPC_URL ?? ARC_MAINNET.rpcUrl, addresses: addressesFromEnv(env),
    allowDev: env.ALLOW_DEV === '1' || (chainMode === 'sim' && env.ALLOW_DEV !== '0'),
    storeFile: env.STORE_FILE ?? null, seed: env.SEED !== '0', corsOrigin: env.CORS_ORIGIN ?? '*', sessionTtlMs: Number(env.SESSION_TTL_H ?? 168) * 3_600_000,
    domain: env.APP_DOMAIN ?? 'opcode.app',
    x: { clientId: env.X_CLIENT_ID, clientSecret: env.X_CLIENT_SECRET, bearer: env.X_BEARER_TOKEN, redirectUri: env.X_REDIRECT_URI, mode: env.X_MODE === 'api' ? 'api' : 'mock' },
    prices: env.PRICE_FEED === 'static' ? 'static' : 'dexscreener', workerMs: Number(env.WORKER_MS ?? 2000),
  };
}
