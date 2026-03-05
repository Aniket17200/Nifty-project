/**
 * Bloomberg Terminal - WEI (World Equity Indices) API Endpoint
 * Fetches real-time global market indices data
 * Called from: /api/wei-indices
 * Source: Yahoo Finance API (batched v7/finance/quote)
 */

interface GlobalIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  volume?: number;
  region: 'Americas' | 'Europe' | 'Asia-Pacific' | 'Africa';
  status: 'Open' | 'Pre-market' | 'After-hours' | 'Closed';
  currency: string;
  lastUpdated: string;
}

interface IndicesResponse {
  indices: GlobalIndex[];
  summary: {
    total: number;
    up: number;
    down: number;
    unchanged: number;
  };
  lastUpdated: string;
}

// Global market indices — all symbols verified to work on Yahoo Finance
const GLOBAL_INDICES = [
  // Americas
  { symbol: '^GSPC', name: 'S&P 500', region: 'Americas', currency: 'USD' },
  { symbol: '^DJI', name: 'Dow Jones', region: 'Americas', currency: 'USD' },
  { symbol: '^IXIC', name: 'NASDAQ', region: 'Americas', currency: 'USD' },
  { symbol: '^RUT', name: 'Russell 2000', region: 'Americas', currency: 'USD' },
  { symbol: '^GSPTSE', name: 'S&P/TSX Composite', region: 'Americas', currency: 'CAD' },
  { symbol: '^MXX', name: 'IPC Mexico', region: 'Americas', currency: 'MXN' },
  { symbol: '^BVSP', name: 'Bovespa', region: 'Americas', currency: 'BRL' },

  // Europe — fixed: FTSEMIB.MI replaces ^MIB, ^SSMI replaces ^SMI
  { symbol: '^FTSE', name: 'FTSE 100', region: 'Europe', currency: 'GBP' },
  { symbol: '^GDAXI', name: 'DAX', region: 'Europe', currency: 'EUR' },
  { symbol: '^FCHI', name: 'CAC 40', region: 'Europe', currency: 'EUR' },
  { symbol: '^IBEX', name: 'IBEX 35', region: 'Europe', currency: 'EUR' },
  { symbol: 'FTSEMIB.MI', name: 'FTSE MIB', region: 'Europe', currency: 'EUR' },
  { symbol: '^AEX', name: 'AEX', region: 'Europe', currency: 'EUR' },
  { symbol: '^OMX', name: 'OMX Stockholm', region: 'Europe', currency: 'SEK' },
  { symbol: '^SSMI', name: 'SMI Swiss', region: 'Europe', currency: 'CHF' },

  // Asia-Pacific
  { symbol: '^N225', name: 'Nikkei 225', region: 'Asia-Pacific', currency: 'JPY' },
  { symbol: '^NSEI', name: 'Nifty 50', region: 'Asia-Pacific', currency: 'INR' },
  { symbol: '^BSESN', name: 'BSE Sensex', region: 'Asia-Pacific', currency: 'INR' },
  { symbol: '^HSI', name: 'Hang Seng', region: 'Asia-Pacific', currency: 'HKD' },
  { symbol: '000001.SS', name: 'Shanghai Composite', region: 'Asia-Pacific', currency: 'CNY' },
  { symbol: '^STI', name: 'Straits Times', region: 'Asia-Pacific', currency: 'SGD' },
  { symbol: '^AXJO', name: 'ASX 200', region: 'Asia-Pacific', currency: 'AUD' },
  { symbol: '^KS11', name: 'KOSPI', region: 'Asia-Pacific', currency: 'KRW' },
  { symbol: '^TWII', name: 'Taiwan Weighted', region: 'Asia-Pacific', currency: 'TWD' },
  { symbol: '^JKSE', name: 'Jakarta Composite', region: 'Asia-Pacific', currency: 'IDR' },
  { symbol: '^NZ50', name: 'NZX 50', region: 'Asia-Pacific', currency: 'NZD' },

  // Africa — fixed: J200.JO replaces JSE.JO, ^CASE30 replaces EGX30.CA
  { symbol: 'J200.JO', name: 'JSE Top 40', region: 'Africa', currency: 'ZAR' },
  { symbol: '^CASE30', name: 'EGX 30', region: 'Africa', currency: 'EGP' },
] as const;

// Get market status based on UTC time and region
function getMarketStatus(region: string): 'Open' | 'Pre-market' | 'After-hours' | 'Closed' {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();

  if (utcDay === 0 || utcDay === 6) return 'Closed';

  if (region === 'Americas') {
    const estHour = (utcHour - 5 + 24) % 24;
    if (estHour >= 9 && estHour < 10) return 'Pre-market';
    if (estHour >= 10 && estHour < 16) return 'Open';
    if (estHour >= 16 && estHour < 20) return 'After-hours';
    return 'Closed';
  }

  // Europe (various timezones, roughly UTC+1 to UTC+3)
  // Trading: 9:00 AM - 5:30 PM local time
  if (region === 'Europe') {
    const cetHour = (utcHour + 1) % 24;
    if (cetHour >= 8 && cetHour < 9) return 'Pre-market';
    if (cetHour >= 9 && cetHour < 17) return 'Open';
    if (cetHour >= 17 && cetHour < 19) return 'After-hours';
    return 'Closed';
  }

  // Asia-Pacific (various timezones)
  if (region === 'Asia-Pacific') {
    // Japan (JST: UTC+9): 9:00 AM - 3:00 PM
    const jstHour = (utcHour + 9) % 24;
    if (jstHour >= 8 && jstHour < 9) return 'Pre-market';
    if (jstHour >= 9 && jstHour < 15) return 'Open';
    if (jstHour >= 15 && jstHour < 17) return 'After-hours';
    return 'Closed';
  }

  if (region === 'Africa') {
    const satHour = (utcHour + 2) % 24; // South Africa Standard Time (SAST) is UTC+2
    if (satHour >= 9 && satHour < 17) return 'Open'; // JSE trading hours 9:00 - 17:00 SAST
    return 'Closed';
  }

  return 'Closed';
}

/**
 * Fetch a single index from Yahoo Finance v8/chart (no auth required).
 * Returns null silently on any error/404 so missing symbols never crash the panel.
 */
async function fetchIndexData(
  sym: string,
  meta: (typeof GLOBAL_INDICES)[number]
): Promise<GlobalIndex | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      }
    );
    clearTimeout(timer);

    if (!res.ok) return null; // silently skip 404 / 401 / etc.

    const data = await res.json();
    const result = data.chart?.result?.[0];
    const chartMeta = result?.meta;
    if (!chartMeta) return null;

    const price: number = chartMeta.regularMarketPrice ?? 0;
    const prevClose: number = chartMeta.previousClose ?? chartMeta.chartPreviousClose ?? price;
    if (!price) return null;

    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    return {
      symbol: sym,
      name: meta.name,
      value: price,
      change,
      changePercent,
      volume: result?.indicators?.quote?.[0]?.volume?.[0] ?? undefined,
      region: meta.region as GlobalIndex['region'],
      currency: chartMeta.currency ?? meta.currency,
      status: getMarketStatus(meta.region),
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    clearTimeout(timer);
    return null; // timeout / network error — silently skip
  }
}

/** Fetch all indices in parallel, silently skip any that fail. */
async function fetchAllIndices(): Promise<GlobalIndex[]> {
  const tasks = GLOBAL_INDICES.map((idx) => fetchIndexData(idx.symbol, idx));
  const settled = await Promise.allSettled(tasks);

  const result: GlobalIndex[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled' && s.value) result.push(s.value);
  }

  const regionOrder = ['Americas', 'Europe', 'Asia-Pacific', 'Africa'];
  result.sort((a, b) => regionOrder.indexOf(a.region) - regionOrder.indexOf(b.region));
  return result;
}

export async function handleWEIIndices(req: Request): Promise<Response> {
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
  const regionParam = reqUrl.searchParams.get('region') as GlobalIndex['region'] | null;

  try {
    let indices = await fetchAllIndices();

    if (regionParam) {
      indices = indices.filter((idx) => idx.region === regionParam);
    }

    const summary = {
      total: indices.length,
      up: indices.filter((idx) => idx.change > 0).length,
      down: indices.filter((idx) => idx.change < 0).length,
      unchanged: indices.filter((idx) => idx.change === 0).length,
    };

    const responseBody: IndicesResponse = {
      indices,
      summary,
      lastUpdated: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[WEI] Error fetching indices:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch market indices', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

