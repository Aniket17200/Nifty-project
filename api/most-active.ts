/**
 * Bloomberg Terminal - MOST (Most Active) API Endpoint
 * Strategy: Use Yahoo Finance's built-in predefined screeners (3 requests
 * instead of 80+). Falls back to a curated static dataset if YF blocks us.
 * Called from: /api/most-active
 */

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  lastUpdated: string;
}

interface MostActiveResponse {
  volumeLeaders: StockData[];
  topGainers: StockData[];
  topLosers: StockData[];
  unusualVolume: StockData[];
  summary: {
    volumeLeaderSymbol: string;
    volumeLeaderVolume: number;
    topGainerSymbol: string;
    topGainerPercent: number;
    topLoserSymbol: string;
    topLoserPercent: number;
  };
  lastUpdated: string;
}

// ── Static fallback data (used when Yahoo Finance is unreachable) ──────────
// Values are deliberately approximate — they just ensure the UI is not empty.
const STATIC_FALLBACK: StockData[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 875.40, change: 12.30, changePercent: 1.43, volume: 52_000_000, avgVolume: 41_000_000, marketCap: 2_150_000_000_000, lastUpdated: new Date().toISOString() },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 188.50, change: -0.80, changePercent: -0.42, volume: 48_000_000, avgVolume: 55_000_000, marketCap: 2_900_000_000_000, lastUpdated: new Date().toISOString() },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 175.20, change: -3.40, changePercent: -1.90, volume: 92_000_000, avgVolume: 100_000_000, marketCap: 558_000_000_000, lastUpdated: new Date().toISOString() },
  { symbol: 'MSFT', name: 'Microsoft Corporation', price: 415.30, change: 2.10, changePercent: 0.51, volume: 20_000_000, avgVolume: 24_000_000, marketCap: 3_090_000_000_000, lastUpdated: new Date().toISOString() },
  { symbol: 'AMD', name: 'Advanced Micro Devices', price: 168.90, change: 4.20, changePercent: 2.55, volume: 38_000_000, avgVolume: 45_000_000, marketCap: 273_000_000_000, lastUpdated: new Date().toISOString() },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 185.40, change: 1.50, changePercent: 0.82, volume: 34_000_000, avgVolume: 38_000_000, marketCap: 1_960_000_000_000, lastUpdated: new Date().toISOString() },
  { symbol: 'META', name: 'Meta Platforms Inc.', price: 503.20, change: 8.90, changePercent: 1.80, volume: 15_000_000, avgVolume: 17_000_000, marketCap: 1_300_000_000_000, lastUpdated: new Date().toISOString() },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 518.00, change: 1.20, changePercent: 0.23, volume: 75_000_000, avgVolume: 80_000_000, marketCap: 0, lastUpdated: new Date().toISOString() },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 445.00, change: 2.10, changePercent: 0.47, volume: 40_000_000, avgVolume: 42_000_000, marketCap: 0, lastUpdated: new Date().toISOString() },
  { symbol: 'PLTR', name: 'Palantir Technologies', price: 24.80, change: 0.90, changePercent: 3.76, volume: 65_000_000, avgVolume: 55_000_000, marketCap: 53_000_000_000, lastUpdated: new Date().toISOString() },
  { symbol: 'INTC', name: 'Intel Corporation', price: 35.10, change: -0.50, changePercent: -1.40, volume: 28_000_000, avgVolume: 32_000_000, marketCap: 148_000_000_000, lastUpdated: new Date().toISOString() },
  { symbol: 'BAC', name: 'Bank of America Corp', price: 37.20, change: 0.30, changePercent: 0.81, volume: 42_000_000, avgVolume: 48_000_000, marketCap: 291_000_000_000, lastUpdated: new Date().toISOString() },
  { symbol: 'GOOG', name: 'Alphabet Inc.', price: 175.80, change: 1.20, changePercent: 0.69, volume: 18_000_000, avgVolume: 20_000_000, marketCap: 2_190_000_000_000, lastUpdated: new Date().toISOString() },
  { symbol: 'COIN', name: 'Coinbase Global Inc.', price: 195.30, change: -5.20, changePercent: -2.59, volume: 22_000_000, avgVolume: 19_000_000, marketCap: 48_000_000_000, lastUpdated: new Date().toISOString() },
  { symbol: 'MARA', name: 'Marathon Holdings', price: 18.40, change: -0.70, changePercent: -3.66, volume: 35_000_000, avgVolume: 28_000_000, marketCap: 4_500_000_000, lastUpdated: new Date().toISOString() },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

/** Parse a Yahoo Finance screener quote into StockData */
function parseScreenerQuote(q: any): StockData | null {
  const price: number = q.regularMarketPrice ?? 0;
  if (!price) return null;
  return {
    symbol: q.symbol,
    name: q.shortName ?? q.longName ?? q.symbol,
    price,
    change: q.regularMarketChange ?? 0,
    changePercent: q.regularMarketChangePercent ?? 0,
    volume: q.regularMarketVolume ?? 0,
    avgVolume: q.averageDailyVolume3Month ?? q.regularMarketVolume ?? 0,
    marketCap: q.marketCap ?? 0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetch one Yahoo Finance predefined screener.
 * scrIds: 'most_actives' | 'day_gainers' | 'day_losers'
 * Returns empty array on any error — never throws.
 */
async function fetchScreener(scrId: string, count = 25): Promise<StockData[]> {
  const url =
    `https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved` +
    `?scrIds=${scrId}&count=${count}&region=US&lang=en-US`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal, headers: HEADERS });
    clearTimeout(timer);
    if (!res.ok) return [];

    const data = await res.json();
    const quotes: any[] = data?.finance?.result?.[0]?.quotes ?? [];
    return quotes.map(parseScreenerQuote).filter(Boolean) as StockData[];
  } catch {
    clearTimeout(timer);
    return [];
  }
}

/** Build static fallback lists from STATIC_FALLBACK */
function buildFallback(limit: number): MostActiveResponse {
  const byVolume = [...STATIC_FALLBACK].sort((a, b) => b.volume - a.volume).slice(0, limit);
  const gainers = STATIC_FALLBACK.filter(s => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, limit);
  const losers = STATIC_FALLBACK.filter(s => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, limit);
  const unusual = STATIC_FALLBACK.filter(s => s.avgVolume > 0 && s.volume / s.avgVolume > 1.2).sort((a, b) => (b.volume / b.avgVolume) - (a.volume / a.avgVolume)).slice(0, 10);

  return {
    volumeLeaders: byVolume,
    topGainers: gainers,
    topLosers: losers,
    unusualVolume: unusual,
    summary: {
      volumeLeaderSymbol: byVolume[0]?.symbol ?? 'N/A',
      volumeLeaderVolume: byVolume[0]?.volume ?? 0,
      topGainerSymbol: gainers[0]?.symbol ?? 'N/A',
      topGainerPercent: gainers[0]?.changePercent ?? 0,
      topLoserSymbol: losers[0]?.symbol ?? 'N/A',
      topLoserPercent: losers[0]?.changePercent ?? 0,
    },
    lastUpdated: new Date().toISOString(),
  };
}

function findUnusualVolume(stocks: StockData[]): StockData[] {
  return stocks
    .filter(s => s.avgVolume > 0 && s.volume / s.avgVolume > 2)
    .sort((a, b) => (b.volume / b.avgVolume) - (a.volume / a.avgVolume))
    .slice(0, 10);
}

export async function handleMostActive(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const reqUrl = new URL(req.url, 'http://localhost:3000');
  const limit = Math.min(parseInt(reqUrl.searchParams.get('limit') ?? '20', 10), 50);

  try {
    // Fire 3 screener calls simultaneously — 3 requests instead of 80+
    const [actives, gainers, losers] = await Promise.all([
      fetchScreener('most_actives', 25),
      fetchScreener('day_gainers', 25),
      fetchScreener('day_losers', 25),
    ]);

    // If Yahoo Finance blocked all three, serve static fallback silently
    if (!actives.length && !gainers.length && !losers.length) {
      return new Response(JSON.stringify(buildFallback(limit)), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=120',
          'Access-Control-Allow-Origin': '*',
          'X-Data-Source': 'static-fallback',
        },
      });
    }

    // Merge all quotes and de-duplicate by symbol
    const allMap = new Map<string, StockData>();
    for (const s of [...actives, ...gainers, ...losers]) {
      if (!allMap.has(s.symbol)) allMap.set(s.symbol, s);
    }
    const all = Array.from(allMap.values());

    // Build sorted lists
    const volumeLeaders = (actives.length ? actives : all.sort((a, b) => b.volume - a.volume)).slice(0, limit);
    const topGainers = (gainers.length ? gainers : all.filter(s => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent)).slice(0, limit);
    const topLosers = (losers.length ? losers : all.filter(s => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent)).slice(0, limit);
    const unusualVolume = findUnusualVolume(all);

    const responseBody: MostActiveResponse = {
      volumeLeaders,
      topGainers,
      topLosers,
      unusualVolume,
      summary: {
        volumeLeaderSymbol: volumeLeaders[0]?.symbol ?? 'N/A',
        volumeLeaderVolume: volumeLeaders[0]?.volume ?? 0,
        topGainerSymbol: topGainers[0]?.symbol ?? 'N/A',
        topGainerPercent: topGainers[0]?.changePercent ?? 0,
        topLoserSymbol: topLosers[0]?.symbol ?? 'N/A',
        topLoserPercent: topLosers[0]?.changePercent ?? 0,
      },
      lastUpdated: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
        'X-Data-Source': 'yahoo-screener',
      },
    });
  } catch (error) {
    // Even top-level errors serve fallback rather than 500
    console.error('[MOST] Unexpected error, serving fallback:', error);
    return new Response(JSON.stringify(buildFallback(limit)), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120',
        'Access-Control-Allow-Origin': '*',
        'X-Data-Source': 'static-fallback',
      },
    });
  }
}
