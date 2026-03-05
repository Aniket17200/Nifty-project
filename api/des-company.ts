/**
 * Bloomberg Terminal - DES (Description) API Endpoint
 * Source: Yahoo Finance v8/finance/chart (no auth required)
 * Called from: /api/des-company?symbol=AAPL
 */

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

async function yf(url: string): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: HEADERS });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(t);
    return null;
  }
}

export async function handleDESCompany(req: Request): Promise<Response> {
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
  const symbol = reqUrl.searchParams.get('symbol')?.toUpperCase().trim();
  if (!symbol) {
    return new Response(JSON.stringify({ error: 'Missing symbol parameter' }), { status: 400 });
  }

  try {
    // Both calls go to v8/chart which is open without auth
    // Call 1: price + financial summary (1d range)
    // Call 2: assetProfile module for sector/description/employees
    const [chartData, profileData] = await Promise.all([
      yf(`https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d&includePrePost=false`),
      yf(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=assetProfile,defaultKeyStatistics,financialData,price`),
    ]);

    const meta = chartData?.chart?.result?.[0]?.meta;

    // If we have absolutely no data, return 404
    if (!meta && !profileData) {
      return new Response(
        JSON.stringify({ error: `No data found for ${symbol}` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse price data from chart meta
    const price: number = meta?.regularMarketPrice ?? 0;
    const prevClose: number = meta?.previousClose ?? meta?.chartPreviousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    // Parse profile modules (may be null if v10 also 401s — graceful fallback)
    const qResult = profileData?.quoteSummary?.result?.[0];
    const asset = qResult?.assetProfile ?? {};
    const keyStats = qResult?.defaultKeyStatistics ?? {};
    const finData = qResult?.financialData ?? {};
    const priceModule = qResult?.price ?? {};

    // Build rich response
    const result = {
      symbol,
      name: priceModule?.longName ?? priceModule?.shortName ?? meta?.longName ?? symbol,
      exchange: meta?.exchangeName ?? priceModule?.exchangeName ?? 'US',
      currency: meta?.currency ?? 'USD',

      // Price
      price,
      previousClose: prevClose,
      change,
      changePercent,
      open: meta?.regularMarketOpen ?? 0,
      high: meta?.regularMarketDayHigh ?? 0,
      low: meta?.regularMarketDayLow ?? 0,
      volume: meta?.regularMarketVolume ?? 0,

      // 52-week
      fiftyTwoWeekHigh: meta?.fiftyTwoWeekHigh ?? keyStats?.['52WeekHigh']?.raw ?? 0,
      fiftyTwoWeekLow: meta?.fiftyTwoWeekLow ?? keyStats?.['52WeekLow']?.raw ?? 0,
      fiftyDayAverage: meta?.fiftyDayAverage ?? 0,
      twoHundredDayAverage: meta?.twoHundredDayAverage ?? 0,

      // Valuation
      marketCap: priceModule?.marketCap?.raw ?? keyStats?.marketCap?.raw ?? 0,
      trailingPE: priceModule?.trailingPE?.raw ?? keyStats?.trailingPE?.raw ?? null,
      forwardPE: keyStats?.forwardPE?.raw ?? null,
      priceToBook: keyStats?.priceToBook?.raw ?? null,
      eps: keyStats?.trailingEps?.raw ?? null,
      beta: keyStats?.beta?.raw ?? null,
      dividendYield: keyStats?.dividendYield?.raw ?? null,

      // Financials
      revenue: finData?.totalRevenue?.raw ?? null,
      grossMargin: finData?.grossMargins?.raw ?? null,
      operatingMargin: finData?.operatingMargins?.raw ?? null,
      netMargin: finData?.profitMargins?.raw ?? null,
      returnOnEquity: finData?.returnOnEquity?.raw ?? null,
      debtToEquity: finData?.debtToEquity?.raw ?? null,
      currentRatio: finData?.currentRatio?.raw ?? null,

      // Company profile
      sector: asset?.sector ?? null,
      industry: asset?.industry ?? null,
      description: asset?.longBusinessSummary ?? null,
      website: asset?.website ?? null,
      employees: asset?.fullTimeEmployees ?? null,
      country: asset?.country ?? null,
      city: asset?.city ?? null,

      lastUpdated: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[DES] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch company data', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
