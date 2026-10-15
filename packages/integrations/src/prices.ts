export interface Quote { symbol: string; usd: number; change24h: number | null; source: string; at: number }
export interface PriceFeed { readonly name: string; prices(symbols: string[]): Promise<Quote[]> }

/** Fixed prices, for tests and offline development. */
export class StaticPriceFeed implements PriceFeed {
  readonly name = 'static';
  private table: Record<string, number>;
  constructor(table: Record<string, number> = { BTC: 82_000, ETH: 2_430, SOL: 105, HYPE: 80 }) { this.table = table; }
  async prices(symbols: string[]) { return symbols.filter((s) => s in this.table).map((s) => ({ symbol: s, usd: this.table[s]!, change24h: null, source: this.name, at: Date.now() })); }
}

/** DexScreener (free, no key): deepest pair per token. HYPE is read from the quote side of its pairs. */
export const DEX_TOKENS: Record<string, { chain: string; address: string }> = {
  BTC: { chain: 'base', address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' },
  ETH: { chain: 'base', address: '0x4200000000000000000000000000000000000006' },
  SOL: { chain: 'solana', address: 'So11111111111111111111111111111111111111112' },
  HYPE: { chain: 'hyperevm', address: '0x5555555555555555555555555555555555555555' },
};
export class DexScreenerFeed implements PriceFeed {
  readonly name = 'dexscreener';
  private fetcher: typeof fetch;
  constructor(fetcher: typeof fetch = fetch) { this.fetcher = fetcher; }
  async prices(symbols: string[]): Promise<Quote[]> {
    const out: Quote[] = [];
    for (const s of symbols) {
      const t = DEX_TOKENS[s]; if (!t) continue;
      const r = await this.fetcher(`https://api.dexscreener.com/tokens/v1/${t.chain}/${t.address}`); if (!r.ok) continue;
      const pairs = (await r.json()) as { baseToken: { address: string }; quoteToken: { address: string }; priceUsd?: string; priceNative?: string; liquidity?: { usd?: number }; priceChange?: { h24?: number } }[];
      let best: Quote | null = null, bestLiq = -1;
      for (const p of pairs ?? []) {
        const liq = p.liquidity?.usd ?? 0, base = p.baseToken.address.toLowerCase() === t.address.toLowerCase();
        const usd = base ? Number(p.priceUsd) : Number(p.priceUsd) / Number(p.priceNative);
        if (usd > 0 && isFinite(usd) && liq > bestLiq) { bestLiq = liq; best = { symbol: s, usd, change24h: base ? p.priceChange?.h24 ?? null : null, source: this.name, at: Date.now() }; }
      }
      if (best) out.push(best);
    }
    return out;
  }
}

/** Tries feeds in order and caches results. */
export class CachedPriceFeed implements PriceFeed {
  readonly name = 'cached';
  private feeds: PriceFeed[]; private ttl: number; private cache = new Map<string, Quote>();
  constructor(feeds: PriceFeed[], ttlMs = 20_000) { this.feeds = feeds; this.ttl = ttlMs; }
  async prices(symbols: string[]) {
    const now = Date.now(), stale = symbols.filter((s) => !this.cache.has(s) || now - this.cache.get(s)!.at > this.ttl);
    for (const f of this.feeds) { if (!stale.length) break; try { for (const q of await f.prices(stale)) { this.cache.set(q.symbol, q); stale.splice(stale.indexOf(q.symbol), 1); } } catch { /* next feed */ } }
    return symbols.map((s) => this.cache.get(s)).filter((q): q is Quote => !!q);
  }
}
