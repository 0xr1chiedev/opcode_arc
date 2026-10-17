import { defineChain, type Address } from 'viem';

/** Arc Mainnet. Gas is paid in USDC; USDC is also an ERC-20 at the address below (6 decimals). */
export const ARC_MAINNET = {
  id: 5042, idHex: '0x13b2', name: 'Arc Mainnet',
  rpcUrl: 'https://rpc.mainnet.arc.io', explorer: 'https://explorer.arc.io',
  usdc: '0x3600000000000000000000000000000000000000' as Address, usdcDecimals: 6,
} as const;

export const arcChain = (rpcUrl: string = ARC_MAINNET.rpcUrl) => defineChain({
  id: ARC_MAINNET.id, name: ARC_MAINNET.name,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: 'Arc explorer', url: ARC_MAINNET.explorer } },
});

/** Opcode contract addresses. Empty until the contracts are deployed; set them through the environment. */
export interface OpcodeAddresses {
  agentRegistry?: Address; jobEscrow?: Address; curveFactory?: Address; presaleVault?: Address;
  vestingVault?: Address; pointsLedger?: Address; paxAccountFactory?: Address; paymentSplitter?: Address; treasury?: Address;
}
const ENV: Record<keyof OpcodeAddresses, string> = {
  agentRegistry: 'OPCODE_AGENT_REGISTRY', jobEscrow: 'OPCODE_JOB_ESCROW', curveFactory: 'OPCODE_CURVE_FACTORY', presaleVault: 'OPCODE_PRESALE_VAULT',
  vestingVault: 'OPCODE_VESTING_VAULT', pointsLedger: 'OPCODE_POINTS_LEDGER', paxAccountFactory: 'OPCODE_PAX_ACCOUNT_FACTORY', paymentSplitter: 'OPCODE_PAYMENT_SPLITTER', treasury: 'OPCODE_TREASURY',
};
export function addressesFromEnv(env: Record<string, string | undefined>): OpcodeAddresses {
  const out: OpcodeAddresses = {};
  for (const [k, v] of Object.entries(ENV)) { const a = env[v]; if (a && /^0x[0-9a-fA-F]{40}$/.test(a)) out[k as keyof OpcodeAddresses] = a as Address; }
  return out;
}
export const ADDRESS_ENV = ENV;
