import { BPS, ONE_TOKEN, ONE_USDC, WAD, ceilDiv, min } from './money.ts';
import { DomainError } from './errors.ts';

/**
 * Bonding curve: constant product with virtual reserves, priced in USDC.
 *   x = X0 + raised (USDC), y = K / x (tokens), K = X0 * Y0
 *   spot price = x² / K
 * Graduation: when raised reaches GRAD, the token moves to a pool; LP is locked for 10 years.
 */
export const SUPPLY = 1_000_000_000n * ONE_TOKEN;
export const X0 = 6_000n * ONE_USDC;
export const Y0 = 1_073_000_000n * ONE_TOKEN;
export const K = X0 * Y0;
export const GRAD = 42_000n * ONE_USDC;
export const LP_LOCK_YEARS = 10;

export interface CurveState { raised: bigint; sold: bigint; graduated: boolean }
export interface PoolState { usdc: bigint; tokens: bigint }

/**
 * The reference curve sells CURVE_SELLABLE tokens up to graduation and needs LP_AT_GRAD tokens to seed the pool
 * at the same price. A launch's curve bucket (e.g. 60% of supply) is mapped onto that reference by a linear scale,
 * so every launch graduates at exactly 42,000 USDC with a continuous price, whatever share sits on the curve.
 */
export const CURVE_SELLABLE = Y0 - ceilDiv(K, X0 + GRAD);
const refPriceWad = (raised: bigint) => { const x = X0 + raised; return (x * x * ONE_TOKEN * WAD) / (K * ONE_USDC); };
export const LP_AT_GRAD = (GRAD * ONE_TOKEN * WAD) / (refPriceWad(GRAD) * ONE_USDC);
export const CURVE_REFERENCE_TOKENS = CURVE_SELLABLE + LP_AT_GRAD;
/** `curveTokens` is the launch's curve bucket in token base units. Omitted = the reference curve. */
export interface CurveCfg { curveTokens: bigint }
const REF: CurveCfg = { curveTokens: CURVE_REFERENCE_TOKENS };
const toReal = (v: bigint, cfg: CurveCfg) => (v * cfg.curveTokens) / CURVE_REFERENCE_TOKENS;
const toRef = (r: bigint, cfg: CurveCfg) => (r * CURVE_REFERENCE_TOKENS) / cfg.curveTokens;

export const newCurve = (raised = 0n, cfg: CurveCfg = REF): CurveState => ({ raised, sold: toReal(Y0 - ceilDiv(K, X0 + raised), cfg), graduated: raised >= GRAD });

/** Spot price in USDC per whole token, as a WAD (1e18 = 1 USDC). */
export function curvePriceWad(raised: bigint, cfg: CurveCfg = REF): bigint {
  return (refPriceWad(raised) * CURVE_REFERENCE_TOKENS) / cfg.curveTokens;
}
export function poolPriceWad(p: PoolState): bigint {
  return (p.usdc * ONE_TOKEN * WAD) / (p.tokens * ONE_USDC);
}
/** Fully diluted value in USDC base units for a WAD price. */
export const fdvFromPriceWad = (priceWad: bigint): bigint => (priceWad * (SUPPLY / ONE_TOKEN) * ONE_USDC) / WAD;
export const priceWadToNumber = (p: bigint): number => Number(p) / 1e18;

export interface BuyQuote { usdcIn: bigint; fee: bigint; buyback: bigint; used: bigint; refund: bigint; tokensOut: bigint; priceAfterWad: bigint; graduates: boolean }
export interface SellQuote { tokensIn: bigint; gross: bigint; fee: bigint; buyback: bigint; usdcOut: bigint; priceAfterWad: bigint }

/** Buy on the curve. The tax (fee + anti-sniper buyback) is taken from the input; anything above the graduation room is refunded. */
export function quoteCurveBuy(c: CurveState, usdcIn: bigint, taxBps: bigint, feeBps: bigint, cfg: CurveCfg = REF): BuyQuote {
  if (c.graduated) throw new DomainError('GRADUATED', 'This token trades in its pool now.');
  if (usdcIn <= 0n) throw new DomainError('AMOUNT', 'Enter an amount above 0.');
  const tax = (usdcIn * taxBps) / BPS, fee = (usdcIn * feeBps) / BPS, buyback = tax - fee;
  const net = usdcIn - tax, room = GRAD - c.raised, used = min(net, room), refund = net - used;
  const x = X0 + c.raised, yBefore = ceilDiv(K, x), yAfter = ceilDiv(K, x + used);
  const tokensOut = toReal(yBefore - yAfter, cfg);
  return { usdcIn, fee, buyback, used, refund, tokensOut, priceAfterWad: curvePriceWad(c.raised + used, cfg), graduates: c.raised + used >= GRAD };
}

export function quoteCurveSell(c: CurveState, tokensIn: bigint, taxBps: bigint, feeBps: bigint, cfg: CurveCfg = REF): SellQuote {
  if (c.graduated) throw new DomainError('GRADUATED', 'This token trades in its pool now.');
  if (tokensIn <= 0n) throw new DomainError('AMOUNT', 'Enter an amount above 0.');
  const x = X0 + c.raised, yBefore = ceilDiv(K, x), xAfter = ceilDiv(K, yBefore + toRef(tokensIn, cfg));
  let gross = x - xAfter; if (gross > c.raised) gross = c.raised; if (gross < 0n) gross = 0n;
  const tax = (gross * taxBps) / BPS, fee = (gross * feeBps) / BPS;
  return { tokensIn, gross, fee, buyback: tax - fee, usdcOut: gross - tax, priceAfterWad: curvePriceWad(c.raised - gross, cfg) };
}

export function applyCurveBuy(c: CurveState, q: BuyQuote): CurveState {
  const raised = c.raised + q.used;
  return { raised, sold: c.sold + q.tokensOut, graduated: raised >= GRAD };
}
export function applyCurveSell(c: CurveState, q: SellQuote): CurveState {
  return { raised: c.raised - q.gross, sold: c.sold - q.tokensIn, graduated: false };
}

/** Pool seeded at graduation with the raised USDC at the curve's final price, so the price does not jump. */
export function graduationPool(cfg: CurveCfg = REF): PoolState {
  return { usdc: GRAD, tokens: toReal(LP_AT_GRAD, cfg) };
}

export function quotePoolBuy(p: PoolState, usdcIn: bigint, taxBps: bigint, feeBps: bigint) {
  if (usdcIn <= 0n) throw new DomainError('AMOUNT', 'Enter an amount above 0.');
  const tax = (usdcIn * taxBps) / BPS, fee = (usdcIn * feeBps) / BPS, net = usdcIn - tax;
  const k = p.usdc * p.tokens, tokensAfter = ceilDiv(k, p.usdc + net), tokensOut = p.tokens - tokensAfter;
  const after = { usdc: p.usdc + net, tokens: tokensAfter };
  return { usdcIn, fee, buyback: tax - fee, net, tokensOut, after, priceAfterWad: poolPriceWad(after) };
}
export function quotePoolSell(p: PoolState, tokensIn: bigint, taxBps: bigint, feeBps: bigint) {
  if (tokensIn <= 0n) throw new DomainError('AMOUNT', 'Enter an amount above 0.');
  const k = p.usdc * p.tokens, usdcAfter = ceilDiv(k, p.tokens + tokensIn), gross = p.usdc - usdcAfter;
  const tax = (gross * taxBps) / BPS, fee = (gross * feeBps) / BPS;
  const after = { usdc: usdcAfter, tokens: p.tokens + tokensIn };
  return { tokensIn, gross, fee, buyback: tax - fee, usdcOut: gross - tax, after, priceAfterWad: poolPriceWad(after) };
}

/** Slippage guard used by every trade: the caller states the minimum it accepts. */
export function checkMinOut(out: bigint, minOut: bigint | undefined) {
  if (minOut !== undefined && out < minOut) throw new DomainError('SLIPPAGE', 'Price moved more than your slippage limit. Try again.');
}
