/** Money on Arc: USDC has 6 decimals, agent tokens 18. All amounts are bigint base units. */
export type Usdc = bigint;
export type Units = bigint;

export const USDC_DECIMALS = 6;
export const TOKEN_DECIMALS = 18;
export const BPS = 10_000n;
export const ONE_USDC = 10n ** 6n;
export const ONE_TOKEN = 10n ** 18n;
export const WAD = 10n ** 18n;

export function parseUnits(value: string | number, decimals: number): bigint {
  const s = String(value).trim();
  if (!/^-?\d*(\.\d*)?$/.test(s) || s === '' || s === '.') throw new Error(`Invalid amount: ${value}`);
  const neg = s.startsWith('-');
  const [i = '0', f = ''] = (neg ? s.slice(1) : s).split('.');
  if (f.length > decimals) throw new Error(`Too many decimals in ${value} (max ${decimals})`);
  const v = BigInt(i || '0') * 10n ** BigInt(decimals) + BigInt((f + '0'.repeat(decimals)).slice(0, decimals) || '0');
  return neg ? -v : v;
}

export function formatUnits(value: bigint, decimals: number, maxFrac = decimals): string {
  const neg = value < 0n, v = neg ? -value : value, base = 10n ** BigInt(decimals);
  const i = v / base, f = (v % base).toString().padStart(decimals, '0').slice(0, maxFrac).replace(/0+$/, '');
  return (neg ? '-' : '') + i.toString() + (f ? '.' + f : '');
}

export const usdc = (v: string | number): Usdc => parseUnits(v, USDC_DECIMALS);
export const tokens = (v: string | number): Units => parseUnits(v, TOKEN_DECIMALS);
export const fmtUsdc = (v: Usdc, frac = 6) => formatUnits(v, USDC_DECIMALS, frac);
export const fmtTokens = (v: Units, frac = 4) => formatUnits(v, TOKEN_DECIMALS, frac);

export const bps = (amount: bigint, b: bigint | number): bigint => (amount * BigInt(b)) / BPS;
export const min = (a: bigint, b: bigint) => (a < b ? a : b);
export const max = (a: bigint, b: bigint) => (a > b ? a : b);
export const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

/** Converts a bigint to a JSON-safe string (bigints never leave the API as numbers). */
export const toJSON = (v: unknown): unknown =>
  typeof v === 'bigint' ? v.toString() : Array.isArray(v) ? v.map(toJSON) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, toJSON(x)])) : v;
