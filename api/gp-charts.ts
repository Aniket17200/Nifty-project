/**
 * Bloomberg Terminal - GP (Graph Prices) API Endpoint
 * Fetches historical price data with technical indicators
 * Called from: /api/gp-charts
 * Source: Yahoo Finance API with technical indicator calculations
 */

interface PriceDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  rsi: { time: string; value: number }[];
  macd: {
    time: string;
    macd: number;
    signal: number;
    histogram: number;
  }[];
  bollinger: {
    time: string;
    upper: number;
    middle: number;
    lower: number;
  }[];
  sma20: { time: string; value: number }[];
  sma50: { time: string; value: number }[];
  sma200: { time: string; value: number }[];
  ema12: { time: string; value: number }[];
  ema26: { time: string; value: number }[];
}

interface ChartResponse {
  symbol: string;
  interval: string;
  range: string;
  priceData: PriceDataPoint[];
  indicators: TechnicalIndicators;
  summary: {
    currentPrice: number;
    change: number;
    changePercent: number;
    dayHigh: number;
    dayLow: number;
    volume: number;
    rsi: number;
    macd: { macd: number; signal: number; histogram: number };
    trend: 'Strong Uptrend' | 'Uptrend' | 'Consolidation' | 'Downtrend' | 'Strong Downtrend';
  };
  lastUpdated: string;
}

// Calculate Simple Moving Average
function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }

  return sma;
}

// Calculate Exponential Moving Average
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  let prevEma = data[0];
  ema.push(prevEma);

  for (let i = 1; i < data.length; i++) {
    const currentEma = (data[i] - prevEma) * multiplier + prevEma;
    ema.push(currentEma);
    prevEma = currentEma;
  }

  return ema;
}

// Calculate RSI (Relative Strength Index)
function calculateRSI(closes: number[], period: number = 14): { time: string; value: number }[] {
  const rsi: { time: string; value: number }[] = [];

  if (closes.length < period) {
    return rsi;
  }

  let gains = 0;
  let losses = 0;

  // Initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calculate RSI for each period
  for (let i = period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];

    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }

    const rs = avgGain / avgLoss;
    const rsiValue = 100 - (100 / (1 + rs));

    rsi.push({
      time: new Date(Date.now() - (closes.length - i) * 86400000).toISOString().split('T')[0],
      value: rsiValue,
    });
  }

  return rsi;
}

// Calculate MACD (Moving Average Convergence Divergence)
function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { time: string; macd: number; signal: number; histogram: number }[] {
  const macd: { time: string; macd: number; signal: number; histogram: number }[] = [];

  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);

  const macdLine = emaFast.map((fast, i) => fast - emaSlow[i]);
  const signalLine = calculateEMA(macdLine.filter((v) => !isNaN(v)), signalPeriod);

  for (let i = 0; i < macdLine.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      continue;
    }

    const histogram = macdLine[i] - signalLine[i];

    macd.push({
      time: new Date(Date.now() - (macdLine.length - i) * 86400000).toISOString().split('T')[0],
      macd: macdLine[i],
      signal: signalLine[i],
      histogram,
    });
  }

  return macd;
}

// Calculate Bollinger Bands
function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): { time: string; upper: number; middle: number; lower: number }[] {
  const bollinger: { time: string; upper: number; middle: number; lower: number }[] = [];
  const sma = calculateSMA(closes, period);

  for (let i = 0; i < sma.length; i++) {
    if (isNaN(sma[i])) {
      continue;
    }

    const subset = closes.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = subset.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    bollinger.push({
      time: new Date(Date.now() - (sma.length - i) * 86400000).toISOString().split('T')[0],
      upper: mean + (standardDeviation * stdDev),
      middle: mean,
      lower: mean - (standardDeviation * stdDev),
    });
  }

  return bollinger;
}

// Determine trend based on moving averages
function determineTrend(
  price: number,
  sma20: number,
  sma50: number,
  sma200: number,
  rsi: number
): 'Strong Uptrend' | 'Uptrend' | 'Consolidation' | 'Downtrend' | 'Strong Downtrend' {
  if (price > sma20 && price > sma50 && price > sma200 && sma20 > sma50 && sma50 > sma200) {
    if (rsi < 70) return 'Strong Uptrend';
    return 'Uptrend';
  }

  if (price < sma20 && price < sma50 && price < sma200 && sma20 < sma50 && sma50 < sma200) {
    if (rsi > 30) return 'Strong Downtrend';
    return 'Downtrend';
  }

  return 'Consolidation';
}


// Resilient Yahoo Finance fetcher — tries multiple hostnames and enforces a
// 5-second timeout so a DNS failure returns a clean error instead of hanging.
async function yfFetch(path: string): Promise<Response> {
  const HOSTS = [
    'https://query2.finance.yahoo.com',
    'https://query1.finance.yahoo.com',
    'https://finance.yahoo.com',
  ];
  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    Accept: 'application/json, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
  };
  let lastErr: unknown;
  for (const host of HOSTS) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(`${host}${path}`, { headers: HEADERS, signal: ctrl.signal });
      clearTimeout(tid);
      return res;
    } catch (e) {
      clearTimeout(tid);
      lastErr = e;
      // continue to next host
    }
  }
  throw lastErr;
}

export async function handleGPCharts(req: Request): Promise<Response> {
  // Handle CORS
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

  const url = new URL(req.url, 'http://localhost:3000');
  const symbol = url.searchParams.get('symbol')?.toUpperCase().trim();
  const interval = url.searchParams.get('interval') || '1d';
  const range = url.searchParams.get('range') || '3mo';

  if (!symbol) {
    return new Response(JSON.stringify({ error: 'Missing symbol parameter' }), { status: 400 });
  }

  try {
    // Fetch data from Yahoo Finance with timeout + host fallback
    const response = await yfFetch(
      `/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`
    );

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch data for ${symbol}` }), { status: response.status });
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      return new Response(JSON.stringify({ error: `No data found for symbol: ${symbol}` }), { status: 404 });
    }

    const timestamps = result.timestamp;
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];

    if (!timestamps || !quote) {
      return new Response(JSON.stringify({ error: 'Invalid data format' }), { status: 400 });
    }

    // Format price data
    const priceData: PriceDataPoint[] = [];
    const closes: number[] = [];

    // Intraday intervals need Unix timestamp (number), daily can use date string
    const isIntraday = ['1m', '5m', '15m', '30m', '60m', '90m'].includes(interval);

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i] as number;
      const date = new Date(ts * 1000);
      // For intraday use unix timestamp, for daily use YYYY-MM-DD string
      const timeValue = isIntraday ? ts : date.toISOString().split('T')[0];
      const open = quote.open[i];
      const high = quote.high[i];
      const low = quote.low[i];
      const close = quote.close[i];
      const volume = quote.volume[i];

      if (open !== null && high !== null && low !== null && close !== null && open !== undefined && close !== undefined) {
        priceData.push({
          time: timeValue as any,
          open,
          high,
          low,
          close,
          volume: volume || 0,
        });
        closes.push(close);
      }
    }

    // Calculate technical indicators
    const rsi = calculateRSI(closes);
    const macd = calculateMACD(closes);
    const bollinger = calculateBollingerBands(closes);
    const sma20 = calculateSMA(closes, 20).map((v, i) => ({
      time: priceData[i]?.time || '',
      value: v,
    }));
    const sma50 = calculateSMA(closes, 50).map((v, i) => ({
      time: priceData[i]?.time || '',
      value: v,
    }));
    const sma200 = calculateSMA(closes, 200).map((v, i) => ({
      time: priceData[i]?.time || '',
      value: v,
    }));

    // Get current values
    const latestRSI = rsi.length > 0 ? rsi[rsi.length - 1].value : 50;
    const latestMACD = macd.length > 0 ? macd[macd.length - 1] : { macd: 0, signal: 0, histogram: 0 };
    const latestSMA20 = sma20[sma20.length - 1]?.value || 0;
    const latestSMA50 = sma50[sma50.length - 1]?.value || 0;
    const latestSMA200 = sma200[sma200.length - 1]?.value || 0;

    const currentPrice = priceData[priceData.length - 1]?.close || meta.regularMarketPrice || 0;
    const previousClose = meta.previousClose || 0;
    const dayHigh = meta.regularMarketDayHigh || 0;
    const dayLow = meta.regularMarketDayLow || 0;

    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    // Determine trend
    const trend = determineTrend(currentPrice, latestSMA20, latestSMA50, latestSMA200, latestRSI);

    const chartResponse: ChartResponse = {
      symbol,
      interval,
      range,
      priceData,
      indicators: {
        rsi,
        macd,
        bollinger,
        sma20,
        sma50,
        sma200,
        ema12: [],
        ema26: [],
      },
      summary: {
        currentPrice,
        change,
        changePercent,
        dayHigh,
        dayLow,
        volume: quote.volume[quote.volume.length - 1] || 0,
        rsi: latestRSI,
        macd: latestMACD,
        trend,
      },
      lastUpdated: new Date().toISOString(),
    };

    return new Response(JSON.stringify(chartResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in GP charts endpoint:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch chart data',
        details: String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
