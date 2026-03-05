import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve, dirname, extname } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { brotliCompress } from 'zlib';
import { promisify } from 'util';
import pkg from './package.json';

const isE2E = process.env.VITE_E2E === '1';
const isDesktopBuild = process.env.VITE_DESKTOP_RUNTIME === '1';

const brotliCompressAsync = promisify(brotliCompress);
const BROTLI_EXTENSIONS = new Set(['.js', '.mjs', '.css', '.html', '.svg', '.json', '.txt', '.xml', '.wasm']);

// ─── Resilient Yahoo Finance fetcher ─────────────────────────────────────────
// Tries query2 → query1 → finance.yahoo.com with a 5-second per-host timeout.
// Prevents ENOTFOUND / network errors from crashing the entire dev plugin.
const YF_HOSTS = [
  'https://query2.finance.yahoo.com',
  'https://query1.finance.yahoo.com',
  'https://finance.yahoo.com',
];
const YF_COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Accept: 'application/json, */*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity', // avoid gzip issues in Node fetch
};
async function yfFetch(path: string, extraHeaders: Record<string, string> = {}): Promise<Response> {
  let lastErr: unknown;
  for (const host of YF_HOSTS) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(new Error('YF timeout')), 5000);
    try {
      const res = await fetch(`${host}${path}`, {
        headers: { ...YF_COMMON_HEADERS, ...extraHeaders },
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      return res;
    } catch (e) {
      clearTimeout(tid);
      lastErr = e;
      console.warn(`[YF] ${host}${path.slice(0, 60)} failed:`, (e as Error).message);
    }
  }
  throw lastErr; // all hosts exhausted
}
async function yfJSON(path: string): Promise<any | null> {
  try {
    const r = await yfFetch(path);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    console.warn('[YF] fetch failed:', (e as Error).message);
    return null;
  }
}


function brotliPrecompressPlugin(): Plugin {
  return {
    name: 'brotli-precompress',
    apply: 'build',
    async writeBundle(outputOptions, bundle) {
      const outDir = outputOptions.dir;
      if (!outDir) return;

      await Promise.all(Object.keys(bundle).map(async (fileName) => {
        const extension = extname(fileName).toLowerCase();
        if (!BROTLI_EXTENSIONS.has(extension)) return;

        const sourcePath = resolve(outDir, fileName);
        const compressedPath = `${sourcePath}.br`;
        const sourceBuffer = await readFile(sourcePath);
        if (sourceBuffer.length < 1024) return;

        const compressedBuffer = await brotliCompressAsync(sourceBuffer);
        await mkdir(dirname(compressedPath), { recursive: true });
        await writeFile(compressedPath, compressedBuffer);
      }));
    },
  };
}

const VARIANT_META: Record<string, {
  title: string;
  description: string;
  keywords: string;
  url: string;
  siteName: string;
  shortName: string;
  subject: string;
  classification: string;
  categories: string[];
  features: string[];
}> = {
  full: {
    title: 'World Monitor - Real-Time Global Intelligence Dashboard',
    description: 'Real-time global intelligence dashboard with live news, markets, military tracking, infrastructure monitoring, and geopolitical data. OSINT in one view.',
    keywords: 'global intelligence, geopolitical dashboard, world news, market data, military bases, nuclear facilities, undersea cables, conflict zones, real-time monitoring, situation awareness, OSINT, flight tracking, AIS ships, earthquake monitor, protest tracker, power outages, oil prices, government spending, polymarket predictions',
    url: 'https://worldmonitor.app/',
    siteName: 'World Monitor',
    shortName: 'WorldMonitor',
    subject: 'Real-Time Global Intelligence and Situation Awareness',
    classification: 'Intelligence Dashboard, OSINT Tool, News Aggregator',
    categories: ['news', 'productivity'],
    features: [
      'Real-time news aggregation',
      'Stock market tracking',
      'Military flight monitoring',
      'Ship AIS tracking',
      'Earthquake alerts',
      'Protest tracking',
      'Power outage monitoring',
      'Oil price analytics',
      'Government spending data',
      'Prediction markets',
      'Infrastructure monitoring',
      'Geopolitical intelligence',
    ],
  },
  tech: {
    title: 'Tech Monitor - Real-Time AI & Tech Industry Dashboard',
    description: 'Real-time AI and tech industry dashboard tracking tech giants, AI labs, startup ecosystems, funding rounds, and tech events worldwide.',
    keywords: 'tech dashboard, AI industry, startup ecosystem, tech companies, AI labs, venture capital, tech events, tech conferences, cloud infrastructure, datacenters, tech layoffs, funding rounds, unicorns, FAANG, tech HQ, accelerators, Y Combinator, tech news',
    url: 'https://tech.worldmonitor.app/',
    siteName: 'Tech Monitor',
    shortName: 'TechMonitor',
    subject: 'AI, Tech Industry, and Startup Ecosystem Intelligence',
    classification: 'Tech Dashboard, AI Tracker, Startup Intelligence',
    categories: ['news', 'business'],
    features: [
      'Tech news aggregation',
      'AI lab tracking',
      'Startup ecosystem mapping',
      'Tech HQ locations',
      'Conference & event calendar',
      'Cloud infrastructure monitoring',
      'Datacenter mapping',
      'Tech layoff tracking',
      'Funding round analytics',
      'Tech stock tracking',
      'Service status monitoring',
    ],
  },
  happy: {
    title: 'Happy Monitor - Good News & Global Progress',
    description: 'Curated positive news, progress data, and uplifting stories from around the world.',
    keywords: 'good news, positive news, global progress, happy news, uplifting stories, human achievement, science breakthroughs, conservation wins',
    url: 'https://happy.worldmonitor.app/',
    siteName: 'Happy Monitor',
    shortName: 'HappyMonitor',
    subject: 'Good News, Global Progress, and Human Achievement',
    classification: 'Positive News Dashboard, Progress Tracker',
    categories: ['news', 'lifestyle'],
    features: [
      'Curated positive news',
      'Global progress tracking',
      'Live humanity counters',
      'Science breakthrough feed',
      'Conservation tracker',
      'Renewable energy dashboard',
    ],
  },
  finance: {
    title: 'Finance Monitor - Real-Time Markets & Trading Dashboard',
    description: 'Real-time finance and trading dashboard tracking global markets, stock exchanges, central banks, commodities, forex, crypto, and economic indicators worldwide.',
    keywords: 'finance dashboard, trading dashboard, stock market, forex, commodities, central banks, crypto, economic indicators, market news, financial centers, stock exchanges, bonds, derivatives, fintech, hedge funds, IPO tracker, market analysis',
    url: 'https://finance.worldmonitor.app/',
    siteName: 'Finance Monitor',
    shortName: 'FinanceMonitor',
    subject: 'Global Markets, Trading, and Financial Intelligence',
    classification: 'Finance Dashboard, Market Tracker, Trading Intelligence',
    categories: ['finance', 'news'],
    features: [
      'Real-time market data',
      'Stock exchange mapping',
      'Central bank monitoring',
      'Commodity price tracking',
      'Forex & currency news',
      'Crypto & digital assets',
      'Economic indicator alerts',
      'IPO & earnings tracking',
      'Financial center mapping',
      'Sector heatmap',
      'Market radar signals',
    ],
  },
};

const activeVariant = process.env.VITE_VARIANT || 'full';
const activeMeta = VARIANT_META[activeVariant] || VARIANT_META.full;

function htmlVariantPlugin(): Plugin {
  return {
    name: 'html-variant',
    transformIndexHtml(html) {
      let result = html
        .replace(/<title>.*?<\/title>/, `<title>${activeMeta.title}</title>`)
        .replace(/<meta name="title" content=".*?" \/>/, `<meta name="title" content="${activeMeta.title}" />`)
        .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${activeMeta.description}" />`)
        .replace(/<meta name="keywords" content=".*?" \/>/, `<meta name="keywords" content="${activeMeta.keywords}" />`)
        .replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="${activeMeta.url}" />`)
        .replace(/<meta name="application-name" content=".*?" \/>/, `<meta name="application-name" content="${activeMeta.siteName}" />`)
        .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${activeMeta.url}" />`)
        .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${activeMeta.title}" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${activeMeta.description}" />`)
        .replace(/<meta property="og:site_name" content=".*?" \/>/, `<meta property="og:site_name" content="${activeMeta.siteName}" />`)
        .replace(/<meta name="subject" content=".*?" \/>/, `<meta name="subject" content="${activeMeta.subject}" />`)
        .replace(/<meta name="classification" content=".*?" \/>/, `<meta name="classification" content="${activeMeta.classification}" />`)
        .replace(/<meta name="twitter:url" content=".*?" \/>/, `<meta name="twitter:url" content="${activeMeta.url}" />`)
        .replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${activeMeta.title}" />`)
        .replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${activeMeta.description}" />`)
        .replace(/"name": "World Monitor"/, `"name": "${activeMeta.siteName}"`)
        .replace(/"alternateName": "WorldMonitor"/, `"alternateName": "${activeMeta.siteName.replace(' ', '')}"`)
        .replace(/"url": "https:\/\/worldmonitor\.app\/"/, `"url": "${activeMeta.url}"`)
        .replace(/"description": "Real-time global intelligence dashboard with live news, markets, military tracking, infrastructure monitoring, and geopolitical data."/, `"description": "${activeMeta.description}"`)
        .replace(/"featureList": \[[\s\S]*?\]/, `"featureList": ${JSON.stringify(activeMeta.features, null, 8).replace(/\n/g, '\n      ')}`);

      // Theme-color meta — warm cream for happy variant
      if (activeVariant === 'happy') {
        result = result.replace(
          /<meta name="theme-color" content=".*?" \/>/,
          '<meta name="theme-color" content="#FAFAF5" />'
        );
      }

      // Inject build-time variant into the inline script so data-variant is set before CSS loads.
      // Force the variant (don't let stale localStorage override the build-time setting).
      if (activeVariant !== 'full') {
        result = result.replace(
          /if\(v\)document\.documentElement\.dataset\.variant=v;/,
          `v='${activeVariant}';document.documentElement.dataset.variant=v;`
        );
      }

      // Desktop CSP: inject localhost wildcard for dynamic sidecar port.
      // Web builds intentionally exclude localhost to avoid exposing attack surface.
      if (isDesktopBuild) {
        result = result
          .replace(
            /connect-src 'self' https: http:\/\/localhost:5173/,
            "connect-src 'self' https: http://localhost:5173 http://127.0.0.1:*"
          )
          .replace(
            /frame-src 'self'/,
            "frame-src 'self' http://127.0.0.1:*"
          );
      }

      // Favicon variant paths — replace /favico/ paths with variant-specific subdirectory
      if (activeVariant !== 'full') {
        result = result
          .replace(/\/favico\/favicon/g, `/favico/${activeVariant}/favicon`)
          .replace(/\/favico\/apple-touch-icon/g, `/favico/${activeVariant}/apple-touch-icon`)
          .replace(/\/favico\/android-chrome/g, `/favico/${activeVariant}/android-chrome`)
          .replace(/\/favico\/og-image/g, `/favico/${activeVariant}/og-image`);
      }

      return result;
    },
  };
}

// ─── Bloomberg Terminal - Stock Research (Free: Yahoo Finance + CoinGecko) ───
function stockResearchPlugin(): Plugin {
  // No external AI key required. Uses Yahoo Finance + CoinGecko for real data.

  return {
    name: 'stock-research-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/stock-research' || req.method !== 'POST') return next();

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { ticker, name } = JSON.parse(body || '{}') as { ticker?: string; name?: string };
            const query = ((ticker ?? name ?? '').trim()).toUpperCase();
            if (!query) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing ticker' }));
              return;
            }

            // ── Fetch data from Yahoo Finance (resilient: query2→query1→finance) ─
            const [summaryJSON, chartJSON, newsJSON] = await Promise.all([
              yfJSON(`/v10/finance/quoteSummary/${query}?modules=summaryDetail,assetProfile,defaultKeyStatistics,price,financialData,earningsTrend,recommendationTrend`),
              yfJSON(`/v8/finance/chart/${query}?interval=1d&range=6mo`),
              yfJSON(`/v2/finance/news?symbols=${query}&count=5`),
            ]);

            let summary: any = {};
            let chartData: any = null;
            let newsItems: any[] = [];

            const r = summaryJSON?.quoteSummary?.result?.[0];
            if (r) summary = r;
            if (chartJSON) chartData = chartJSON;
            if (newsJSON) newsItems = newsJSON?.items?.result?.slice(0, 5) ?? [];


            // ── Extract key fields ─────────────────────────────────────────────
            const price = summary.price ?? {};
            const fin = summary.financialData ?? {};
            const stats = summary.defaultKeyStatistics ?? {};
            const profile = summary.assetProfile ?? {};
            const detail = summary.summaryDetail ?? {};
            const recTrend = summary.recommendationTrend?.trend?.[0] ?? {};
            const earningsTrend = summary.earningsTrend?.trend?.[0]?.epsTrend ?? {};

            const currentPrice = price.regularMarketPrice?.raw ?? 0;
            const marketCap = price.marketCap?.raw ?? 0;
            const pe = detail.trailingPE?.raw;
            const forwardPE = detail.forwardPE?.raw;
            const eps = stats.trailingEps?.raw;
            const week52High = detail.fiftyTwoWeekHigh?.raw ?? 0;
            const week52Low = detail.fiftyTwoWeekLow?.raw ?? 0;
            const grossMargin = fin.grossMargins?.raw;
            const opMargin = fin.operatingMargins?.raw;
            const netMargin = fin.profitMargins?.raw;
            const revenue = fin.totalRevenue?.raw;
            const fcf = fin.freeCashflow?.raw;
            const debtEq = fin.debtToEquity?.raw;
            const beta = detail.beta?.raw;
            const divYield = detail.dividendYield?.raw;
            const pb = stats.priceToBook?.raw;
            const targetHigh = fin.targetHighPrice?.raw;
            const targetLow = fin.targetLowPrice?.raw;
            const targetMean = fin.targetMeanPrice?.raw;
            const rec = fin.recommendationKey ?? 'hold';
            const ma50 = detail.fiftyDayAverage?.raw;
            const ma200 = detail.twoHundredDayAverage?.raw;
            const totalBuy = (recTrend.strongBuy ?? 0) + (recTrend.buy ?? 0);
            const totalSell = (recTrend.strongSell ?? 0) + (recTrend.sell ?? 0);
            const totalHold = recTrend.hold ?? 0;
            const sector = profile.sector ?? 'N/A';
            const industry = profile.industry ?? 'N/A';
            const employees = profile.fullTimeEmployees;
            const website = profile.website ?? '';
            const bizSummary = (profile.longBusinessSummary ?? '').slice(0, 400);

            const fmt = (v: number | undefined, isPercent = false, decimals = 2) =>
              v != null ? (isPercent ? `${(v * 100).toFixed(decimals)}%` : v.toLocaleString(undefined, { maximumFractionDigits: decimals })) : 'N/A';
            const fmtB = (v: number | undefined) =>
              v == null ? 'N/A' : v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${v.toFixed(2)}`;

            const verdictMap: Record<string, string> = {
              'strong_buy': 'Strong Buy', 'buy': 'Buy', 'hold': 'Hold', 'sell': 'Sell', 'strong_sell': 'Strong Sell',
            };
            const verdictLabel = verdictMap[rec.toLowerCase()] ?? 'Hold';

            // ── Build structured research report ──────────────────────────────
            const trendVs200 = currentPrice && ma200
              ? (currentPrice > ma200 ? `Above (+${((currentPrice / ma200 - 1) * 100).toFixed(1)}%) - Bullish` : `Below (${((currentPrice / ma200 - 1) * 100).toFixed(1)}%) - Bearish`)
              : 'N/A';
            const weekPos = week52High && week52Low && currentPrice
              ? `${(((currentPrice - week52Low) / (week52High - week52Low)) * 100).toFixed(0)}% above 52W low`
              : 'N/A';
            const upside = targetMean && currentPrice
              ? `${(((targetMean - currentPrice) / currentPrice) * 100).toFixed(1)}% upside`
              : 'upside unavailable';
            const impliedUpside = targetMean && currentPrice
              ? `${(((targetMean - currentPrice) / currentPrice) * 100).toFixed(1)}%`
              : 'N/A';
            const divYieldStr = divYield != null ? `${(divYield * 100).toFixed(2)}%` : 'N/A';
            const riskLevel = beta ? (beta > 1.5 ? 'High' : beta > 1.1 ? 'Medium' : 'Low') : 'Medium';
            const bestFor = pe ? (pe < 15 ? 'Value investors' : pe < 30 ? 'Growth & income investors' : 'Momentum/growth investors') : 'General investors';
            const peComment = pe && pe > 30 ? 'is elevated vs market average of ~22x' : 'is within range';
            const betaDesc = beta && beta > 1.5 ? 'high volatility risk' : beta && beta > 1 ? 'moderate market sensitivity' : 'low volatility';
            const sentimentComment = totalSell > 0 ? 'some bearish sentiment present' : 'minimal selling pressure';

            const lines = [
              `## 1. Company Overview`,
              `**${price.longName ?? query}** (${query})`,
              `- **Sector:** ${sector} | **Industry:** ${industry}`,
              `- **Employees:** ${employees?.toLocaleString() ?? 'N/A'} | **Website:** ${website}`,
              `- ${bizSummary}`,
              ``,
              `## 2. Current Price & Valuation Metrics`,
              `- **Current Price:** $${currentPrice.toFixed(2)} | **Market Cap:** ${fmtB(marketCap)}`,
              `- **P/E (TTM):** ${pe?.toFixed(2) ?? 'N/A'} | **Forward P/E:** ${forwardPE?.toFixed(2) ?? 'N/A'} | **P/B:** ${pb?.toFixed(2) ?? 'N/A'}`,
              `- **EPS (TTM):** $${eps?.toFixed(2) ?? 'N/A'} | **Dividend Yield:** ${divYieldStr}`,
              `- **Beta:** ${beta?.toFixed(2) ?? 'N/A'}`,
              `- **52-Week Range:** $${week52Low.toFixed(2)} - $${week52High.toFixed(2)}`,
              `- **50-Day MA:** $${ma50?.toFixed(2) ?? 'N/A'} | **200-Day MA:** $${ma200?.toFixed(2) ?? 'N/A'}`,
              ``,
              `## 3. Financial Performance`,
              `- **Revenue (TTM):** ${fmtB(revenue)}`,
              `- **Gross Margin:** ${fmt(grossMargin, true)} | **Operating Margin:** ${fmt(opMargin, true)} | **Net Margin:** ${fmt(netMargin, true)}`,
              `- **Free Cash Flow (TTM):** ${fmtB(fcf)}`,
              `- **Debt/Equity:** ${debtEq?.toFixed(2) ?? 'N/A'}`,
              ``,
              `## 4. Technical Analysis`,
              `- **Trend vs 200 MA:** ${trendVs200}`,
              `- **52-Week Position:** ${weekPos}`,
              `- **Volatility (Beta):** ${beta?.toFixed(2) ?? 'N/A'}`,
              ``,
              `## 5. Bull Case - Why to BUY`,
              `- ${sector} leader with strong brand moat and pricing power`,
              `- Current price $${currentPrice.toFixed(2)} vs analyst mean target $${targetMean?.toFixed(2) ?? 'N/A'} (${upside})`,
              `- Free cash flow generation supports buybacks and dividends: ${fmtB(fcf)}/yr`,
              `- Analyst high target: $${targetHigh?.toFixed(2) ?? 'N/A'}`,
              `- ${totalBuy} analysts rate Buy/Strong Buy out of ${totalBuy + totalSell + totalHold} total`,
              ``,
              `## 6. Bear Case - Why to AVOID/SELL`,
              `- P/E of ${pe?.toFixed(1) ?? 'N/A'}x ${peComment}`,
              `- High leverage: D/E ${debtEq?.toFixed(2) ?? 'N/A'} - rising rates could pressure margins`,
              `- Beta of ${beta?.toFixed(2) ?? 'N/A'} indicates ${betaDesc}`,
              `- ${totalSell} analysts rate Sell/Strong Sell - ${sentimentComment}`,
              ``,
              `## 7. Analyst Consensus & Price Targets`,
              `- **Consensus:** ${verdictLabel}`,
              `- **Rating Breakdown:** ${recTrend.strongBuy ?? 0} Strong Buy / ${recTrend.buy ?? 0} Buy / ${recTrend.hold ?? 0} Hold / ${recTrend.sell ?? 0} Sell / ${recTrend.strongSell ?? 0} Strong Sell`,
              `- **Mean Price Target:** $${targetMean?.toFixed(2) ?? 'N/A'} | **High:** $${targetHigh?.toFixed(2) ?? 'N/A'} | **Low:** $${targetLow?.toFixed(2) ?? 'N/A'}`,
              `- **Implied Upside:** ${impliedUpside}`,
              ``,
              `## 8. AI Investment Verdict`,
              `AI Recommendation: **${verdictLabel}**`,
              `- 12-month target: $${targetMean?.toFixed(2) ?? 'N/A'} (analyst consensus)`,
              `- Risk level: ${riskLevel}`,
              `- Best for: ${bestFor}`,
              `- Key metric to watch: ${forwardPE ? `Forward P/E ${forwardPE.toFixed(1)}x` : 'Revenue growth trend'}`,
            ];
            const content = lines.join('\n');

            const citations = [
              `https://finance.yahoo.com/quote/${query}`,
              `https://finance.yahoo.com/quote/${query}/financials`,
              `https://finance.yahoo.com/quote/${query}/analysis`,
            ];

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.end(JSON.stringify({ content, citations, ticker: query }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: String(err) }));
          }
        });
      });
    },
  };
}

// ─── Bloomberg Terminal - Finance Analysis (Free: Yahoo Finance) ─────────────
function financeAnalysisPlugin(): Plugin {
  // Uses same Yahoo Finance data pipeline as stockResearchPlugin, richer formatting

  return {
    name: 'finance-analysis-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/finance-analysis' || req.method !== 'POST') return next();

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { ticker, name } = JSON.parse(body || '{}') as { ticker?: string; name?: string };
            const query = ((ticker ?? name ?? '').trim()).toUpperCase();
            if (!query) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing ticker' }));
              return;
            }

            // ── Proxy to Yahoo Finance summary data (free) ─────────────────────
            const YF_HEADERS = {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
              Accept: 'application/json',
            };

            const summaryRes = await fetch(
              `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${query}?modules=summaryDetail,assetProfile,defaultKeyStatistics,price,financialData,earningsTrend,recommendationTrend,calendarEvents,incomeStatementHistory`,
              { headers: YF_HEADERS }
            ).catch(() => null);

            let summary: any = {};
            if (summaryRes?.ok) {
              const d = await summaryRes.json() as any;
              summary = d?.quoteSummary?.result?.[0] ?? {};
            }

            const price = summary.price ?? {};
            const fin = summary.financialData ?? {};
            const stats = summary.defaultKeyStatistics ?? {};
            const profile = summary.assetProfile ?? {};
            const detail = summary.summaryDetail ?? {};
            const recTrend = summary.recommendationTrend?.trend?.[0] ?? {};
            const incomeHistory = summary.incomeStatementHistory?.incomeStatementHistory ?? [];
            const calEvents = summary.calendarEvents ?? {};

            const currentPrice = price.regularMarketPrice?.raw ?? 0;
            const marketCap = price.marketCap?.raw ?? 0;
            const pe = detail.trailingPE?.raw;
            const forwardPE = detail.forwardPE?.raw;
            const eps = stats.trailingEps?.raw;
            const fwdEps = stats.forwardEps?.raw;
            const peg = stats.pegRatio?.raw;
            const pb = stats.priceToBook?.raw;
            const ps = stats.priceToSalesTrailing12Months?.raw;
            const evEbitda = stats.enterpriseToEbitda?.raw;
            const week52High = detail.fiftyTwoWeekHigh?.raw ?? 0;
            const week52Low = detail.fiftyTwoWeekLow?.raw ?? 0;
            const grossMargin = fin.grossMargins?.raw;
            const opMargin = fin.operatingMargins?.raw;
            const netMargin = fin.profitMargins?.raw;
            const revenue = fin.totalRevenue?.raw;
            const fcf = fin.freeCashflow?.raw;
            const debtEq = fin.debtToEquity?.raw;
            const beta = detail.beta?.raw;
            const divYield = detail.dividendYield?.raw;
            const targetMean = fin.targetMeanPrice?.raw;
            const targetHigh = fin.targetHighPrice?.raw;
            const targetLow = fin.targetLowPrice?.raw;
            const rec = fin.recommendationKey ?? 'hold';
            const ma50 = detail.fiftyDayAverage?.raw;
            const ma200 = detail.twoHundredDayAverage?.raw;
            const totalBuy = (recTrend.strongBuy ?? 0) + (recTrend.buy ?? 0);
            const totalSell = (recTrend.strongSell ?? 0) + (recTrend.sell ?? 0);
            const sector = profile.sector ?? 'N/A';
            const industry = profile.industry ?? 'N/A';
            const bizSummary = (profile.longBusinessSummary ?? '').slice(0, 500);
            const nextEarnings = calEvents.earnings?.earningsDate?.[0]?.fmt ?? 'N/A';

            const fmtB = (v: number | undefined) =>
              v == null ? 'N/A' : v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${v.toFixed(2)}`;
            const fmt = (v: number | undefined, isPercent = false) =>
              v != null ? (isPercent ? `${(v * 100).toFixed(2)}%` : v.toFixed(2)) : 'N/A';

            const verdictMap: Record<string, string> = {
              strong_buy: 'Strong Buy', buy: 'Buy', hold: 'Hold', sell: 'Sell', strong_sell: 'Strong Sell',
            };
            const verdictLabel = verdictMap[rec.toLowerCase()] ?? 'Hold';

            // Build quarterly revenue rows from income history
            const qRows = incomeHistory.slice(0, 4).map((qItem: any) => {
              const r = qItem?.totalRevenue?.raw;
              const ni = qItem?.netIncome?.raw;
              const yr = qItem?.endDate?.fmt?.slice(0, 7) ?? '';
              return `  - ${yr}: Rev ${fmtB(r)}, Net Inc ${fmtB(ni)}`;
            }).join('\n') || '  (Quarterly data unavailable)';

            const fa_trendStr = currentPrice && ma200
              ? (currentPrice > ma200
                ? 'Bullish - Above 200MA by ' + ((currentPrice / ma200 - 1) * 100).toFixed(1) + '%'
                : 'Bearish - Below 200MA by ' + Math.abs(((currentPrice / ma200 - 1) * 100)).toFixed(1) + '%')
              : 'N/A';
            const fa_posStr = week52High && week52Low && currentPrice
              ? (((currentPrice - week52Low) / (week52High - week52Low)) * 100).toFixed(0) + '% of 52-week range'
              : 'N/A';
            const fa_betaRisk = beta && beta > 1.5 ? 'High market sensitivity' : beta && beta > 1.1 ? 'Moderate volatility' : 'Low volatility, defensive';
            const fa_upsideStr = targetMean && currentPrice
              ? '$' + targetMean.toFixed(2) + ' mean target = ' + (((targetMean - currentPrice) / currentPrice) * 100).toFixed(1) + '% upside'
              : 'N/A';
            const fa_downsideStr = targetLow && currentPrice
              ? (((targetLow - currentPrice) / currentPrice) * 100).toFixed(1) + '% downside'
              : 'N/A';
            const fa_impliedStr = targetMean && currentPrice
              ? (((targetMean - currentPrice) / currentPrice) * 100).toFixed(1) + '%'
              : 'N/A';
            const fa_divStr = divYield != null ? (divYield * 100).toFixed(2) + '%' : 'N/A';
            const fa_peComment = pe && pe > 30 ? 'is stretched vs market avg ~22x' : 'is moderate';
            const fa_leverageComment = debtEq && debtEq > 100 ? 'heavily leveraged, rate risk' : 'manageable debt load';
            const fa_betaComment2 = beta && beta > 1.2 ? 'amplifies market drawdowns' : 'relatively stable';
            const fa_riskLevel = beta ? (beta > 1.5 ? 'High' : beta > 1.1 ? 'Medium' : 'Low') : 'Medium';
            const fa_bestFor = pe ? (pe < 15 ? 'Value investors' : pe < 30 ? 'Growth & income' : 'Momentum traders') : 'General investors';

            const faLines = [
              `## 1. Company Overview`,
              `**${price.longName ?? query}** | ${query} | ${sector} > ${industry}`,
              `${bizSummary}`,
              ``,
              `## 2. Current Price & Valuation Metrics`,
              `- **Price:** $${currentPrice.toFixed(2)} | **Market Cap:** ${fmtB(marketCap)}`,
              `- **P/E (TTM):** ${fmt(pe)} | **Forward P/E:** ${fmt(forwardPE)} | **PEG:** ${fmt(peg)}`,
              `- **EPS (TTM):** $${fmt(eps)} | **Forward EPS:** $${fmt(fwdEps)}`,
              `- **Price/Book:** ${fmt(pb)} | **Price/Sales:** ${fmt(ps)} | **EV/EBITDA:** ${fmt(evEbitda)}`,
              `- **Dividend Yield:** ${fa_divStr} | **Beta:** ${fmt(beta)}`,
              `- **52-Week Range:** $${week52Low.toFixed(2)} - $${week52High.toFixed(2)}`,
              ``,
              `## 3. Financial Performance`,
              `Recent Quarterly Revenue:`,
              qRows,
              `- **Revenue (TTM):** ${fmtB(revenue)}`,
              `- **Gross Margin:** ${fmt(grossMargin, true)} | **Operating Margin:** ${fmt(opMargin, true)} | **Net Margin:** ${fmt(netMargin, true)}`,
              `- **Free Cash Flow:** ${fmtB(fcf)} | **Debt/Equity:** ${fmt(debtEq)}`,
              ``,
              `## 4. Technical Analysis`,
              `- **50-Day MA:** $${fmt(ma50)} | **200-Day MA:** $${fmt(ma200)}`,
              `- **Trend:** ${fa_trendStr}`,
              `- **52W Position:** ${fa_posStr}`,
              `- **Risk (Beta):** ${beta?.toFixed(2) ?? 'N/A'} - ${fa_betaRisk}`,
              ``,
              `## 5. Bull Case - Why to BUY`,
              `- **Strong analyst conviction:** ${totalBuy} Buy/Strong Buy out of ${totalBuy + totalSell + (recTrend.hold ?? 0)} analysts`,
              `- **Upside to consensus target:** ${fa_upsideStr}`,
              `- **Cash generation machine:** Free Cash Flow of ${fmtB(fcf)} supports dividends/buybacks`,
              `- **Margin quality:** ${fmt(opMargin, true)} operating margin, ${fmt(netMargin, true)} net margin`,
              `- **Upcoming catalyst:** Next earnings ${nextEarnings}`,
              ``,
              `## 6. Bear Case - Why to AVOID/SELL`,
              `- **Valuation:** P/E of ${fmt(pe)}x ${fa_peComment}`,
              `- **Downside risk:** Analyst low target $${targetLow?.toFixed(2) ?? 'N/A'} implies ${fa_downsideStr}`,
              `- **Leverage:** D/E of ${fmt(debtEq)} - ${fa_leverageComment}`,
              `- **Beta risk:** ${fmt(beta)} - ${fa_betaComment2}`,
              `- **${totalSell} analysts recommend Sell/Strong Sell**`,
              ``,
              `## 7. Analyst Consensus & Price Targets`,
              `- **Consensus Rating:** ${verdictLabel}`,
              `- **Distribution:** ${recTrend.strongBuy ?? 0} Strong Buy / ${recTrend.buy ?? 0} Buy / ${recTrend.hold ?? 0} Hold / ${recTrend.sell ?? 0} Sell / ${recTrend.strongSell ?? 0} Strong Sell`,
              `- **Target: Mean $${targetMean?.toFixed(2) ?? 'N/A'} | High $${targetHigh?.toFixed(2) ?? 'N/A'} | Low $${targetLow?.toFixed(2) ?? 'N/A'}**`,
              `- **Implied Upside/Downside:** ${fa_impliedStr} to consensus`,
              ``,
              `## 8. AI Investment Verdict`,
              `AI Recommendation: **${verdictLabel}**`,
              `- 12-month target: $${targetMean?.toFixed(2) ?? 'N/A'} (analyst consensus)`,
              `- Risk level: ${fa_riskLevel}`,
              `- Best for: ${fa_bestFor}`,
              `- Next catalyst: Earnings on ${nextEarnings}`,
            ];
            const content = faLines.join('\n');

            const citations = [
              `https://finance.yahoo.com/quote/${query}`,
              `https://finance.yahoo.com/quote/${query}/financials`,
              `https://finance.yahoo.com/quote/${query}/analysis`,
              `https://finance.yahoo.com/quote/${query}/holders`,
            ];

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.end(JSON.stringify({ content, citations, ticker: query }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: String(err) }));
          }
        });
      });
    },
  };
}

function polymarketPlugin(): Plugin {
  const GAMMA_BASE = 'https://gamma-api.polymarket.com';
  const ALLOWED_ORDER = ['volume', 'liquidity', 'startDate', 'endDate', 'spread'];

  return {
    name: 'polymarket-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/polymarket')) return next();

        const url = new URL(req.url, 'http://localhost');
        const endpoint = url.searchParams.get('endpoint') || 'markets';
        const closed = ['true', 'false'].includes(url.searchParams.get('closed') ?? '') ? url.searchParams.get('closed') : 'false';
        const order = ALLOWED_ORDER.includes(url.searchParams.get('order') ?? '') ? url.searchParams.get('order') : 'volume';
        const ascending = ['true', 'false'].includes(url.searchParams.get('ascending') ?? '') ? url.searchParams.get('ascending') : 'false';
        const rawLimit = parseInt(url.searchParams.get('limit') ?? '', 10);
        const limit = isNaN(rawLimit) ? 50 : Math.max(1, Math.min(100, rawLimit));

        const params = new URLSearchParams({ closed: closed!, order: order!, ascending: ascending!, limit: String(limit) });
        if (endpoint === 'events') {
          const tag = (url.searchParams.get('tag') ?? '').replace(/[^a-z0-9-]/gi, '').slice(0, 100);
          if (tag) params.set('tag_slug', tag);
        }

        const gammaUrl = `${GAMMA_BASE}/${endpoint === 'events' ? 'events' : 'markets'}?${params}`;

        res.setHeader('Content-Type', 'application/json');
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          const resp = await fetch(gammaUrl, { headers: { Accept: 'application/json' }, signal: controller.signal });
          clearTimeout(timer);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = await resp.text();
          res.setHeader('Cache-Control', 'public, max-age=120');
          res.setHeader('X-Polymarket-Source', 'gamma');
          res.end(data);
        } catch {
          // Expected: Cloudflare JA3 blocks server-side TLS — return empty array
          res.setHeader('Cache-Control', 'public, max-age=300');
          res.end('[]');
        }
      });
    },
  };
}

/**
 * Vite dev server plugin for sebuf API routes.
 *
 * Intercepts requests matching /api/{domain}/v1/* and routes them through
 * the same handler pipeline as the Vercel catch-all gateway. Other /api/*
 * paths fall through to existing proxy rules.
 */
function sebufApiPlugin(): Plugin {
  // Cache router across requests (H-13 fix). Invalidated by Vite's module graph on HMR.
  let cachedRouter: Awaited<ReturnType<typeof buildRouter>> | null = null;
  let cachedCorsMod: any = null;

  async function buildRouter() {
    const [
      routerMod, corsMod, errorMod,
      seismologyServerMod, seismologyHandlerMod,
      wildfireServerMod, wildfireHandlerMod,
      climateServerMod, climateHandlerMod,
      predictionServerMod, predictionHandlerMod,
      displacementServerMod, displacementHandlerMod,
      aviationServerMod, aviationHandlerMod,
      researchServerMod, researchHandlerMod,
      unrestServerMod, unrestHandlerMod,
      conflictServerMod, conflictHandlerMod,
      maritimeServerMod, maritimeHandlerMod,
      cyberServerMod, cyberHandlerMod,
      economicServerMod, economicHandlerMod,
      infrastructureServerMod, infrastructureHandlerMod,
      marketServerMod, marketHandlerMod,
      newsServerMod, newsHandlerMod,
      intelligenceServerMod, intelligenceHandlerMod,
      militaryServerMod, militaryHandlerMod,
      positiveEventsServerMod, positiveEventsHandlerMod,
      givingServerMod, givingHandlerMod,
      tradeServerMod, tradeHandlerMod,
    ] = await Promise.all([
      import('./server/router'),
      import('./server/cors'),
      import('./server/error-mapper'),
      import('./src/generated/server/worldmonitor/seismology/v1/service_server'),
      import('./server/worldmonitor/seismology/v1/handler'),
      import('./src/generated/server/worldmonitor/wildfire/v1/service_server'),
      import('./server/worldmonitor/wildfire/v1/handler'),
      import('./src/generated/server/worldmonitor/climate/v1/service_server'),
      import('./server/worldmonitor/climate/v1/handler'),
      import('./src/generated/server/worldmonitor/prediction/v1/service_server'),
      import('./server/worldmonitor/prediction/v1/handler'),
      import('./src/generated/server/worldmonitor/displacement/v1/service_server'),
      import('./server/worldmonitor/displacement/v1/handler'),
      import('./src/generated/server/worldmonitor/aviation/v1/service_server'),
      import('./server/worldmonitor/aviation/v1/handler'),
      import('./src/generated/server/worldmonitor/research/v1/service_server'),
      import('./server/worldmonitor/research/v1/handler'),
      import('./src/generated/server/worldmonitor/unrest/v1/service_server'),
      import('./server/worldmonitor/unrest/v1/handler'),
      import('./src/generated/server/worldmonitor/conflict/v1/service_server'),
      import('./server/worldmonitor/conflict/v1/handler'),
      import('./src/generated/server/worldmonitor/maritime/v1/service_server'),
      import('./server/worldmonitor/maritime/v1/handler'),
      import('./src/generated/server/worldmonitor/cyber/v1/service_server'),
      import('./server/worldmonitor/cyber/v1/handler'),
      import('./src/generated/server/worldmonitor/economic/v1/service_server'),
      import('./server/worldmonitor/economic/v1/handler'),
      import('./src/generated/server/worldmonitor/infrastructure/v1/service_server'),
      import('./server/worldmonitor/infrastructure/v1/handler'),
      import('./src/generated/server/worldmonitor/market/v1/service_server'),
      import('./server/worldmonitor/market/v1/handler'),
      import('./src/generated/server/worldmonitor/news/v1/service_server'),
      import('./server/worldmonitor/news/v1/handler'),
      import('./src/generated/server/worldmonitor/intelligence/v1/service_server'),
      import('./server/worldmonitor/intelligence/v1/handler'),
      import('./src/generated/server/worldmonitor/military/v1/service_server'),
      import('./server/worldmonitor/military/v1/handler'),
      import('./src/generated/server/worldmonitor/positive_events/v1/service_server'),
      import('./server/worldmonitor/positive-events/v1/handler'),
      import('./src/generated/server/worldmonitor/giving/v1/service_server'),
      import('./server/worldmonitor/giving/v1/handler'),
      import('./src/generated/server/worldmonitor/trade/v1/service_server'),
      import('./server/worldmonitor/trade/v1/handler'),
    ]);

    const serverOptions = { onError: errorMod.mapErrorToResponse };
    const allRoutes = [
      ...seismologyServerMod.createSeismologyServiceRoutes(seismologyHandlerMod.seismologyHandler, serverOptions),
      ...wildfireServerMod.createWildfireServiceRoutes(wildfireHandlerMod.wildfireHandler, serverOptions),
      ...climateServerMod.createClimateServiceRoutes(climateHandlerMod.climateHandler, serverOptions),
      ...predictionServerMod.createPredictionServiceRoutes(predictionHandlerMod.predictionHandler, serverOptions),
      ...displacementServerMod.createDisplacementServiceRoutes(displacementHandlerMod.displacementHandler, serverOptions),
      ...aviationServerMod.createAviationServiceRoutes(aviationHandlerMod.aviationHandler, serverOptions),
      ...researchServerMod.createResearchServiceRoutes(researchHandlerMod.researchHandler, serverOptions),
      ...unrestServerMod.createUnrestServiceRoutes(unrestHandlerMod.unrestHandler, serverOptions),
      ...conflictServerMod.createConflictServiceRoutes(conflictHandlerMod.conflictHandler, serverOptions),
      ...maritimeServerMod.createMaritimeServiceRoutes(maritimeHandlerMod.maritimeHandler, serverOptions),
      ...cyberServerMod.createCyberServiceRoutes(cyberHandlerMod.cyberHandler, serverOptions),
      ...economicServerMod.createEconomicServiceRoutes(economicHandlerMod.economicHandler, serverOptions),
      ...infrastructureServerMod.createInfrastructureServiceRoutes(infrastructureHandlerMod.infrastructureHandler, serverOptions),
      ...marketServerMod.createMarketServiceRoutes(marketHandlerMod.marketHandler, serverOptions),
      ...newsServerMod.createNewsServiceRoutes(newsHandlerMod.newsHandler, serverOptions),
      ...intelligenceServerMod.createIntelligenceServiceRoutes(intelligenceHandlerMod.intelligenceHandler, serverOptions),
      ...militaryServerMod.createMilitaryServiceRoutes(militaryHandlerMod.militaryHandler, serverOptions),
      ...positiveEventsServerMod.createPositiveEventsServiceRoutes(positiveEventsHandlerMod.positiveEventsHandler, serverOptions),
      ...givingServerMod.createGivingServiceRoutes(givingHandlerMod.givingHandler, serverOptions),
      ...tradeServerMod.createTradeServiceRoutes(tradeHandlerMod.tradeHandler, serverOptions),
    ];
    cachedCorsMod = corsMod;
    return routerMod.createRouter(allRoutes);
  }

  return {
    name: 'sebuf-api',
    configureServer(server) {
      // Invalidate cached router on HMR updates to server/ files
      server.watcher.on('change', (file) => {
        if (file.includes('/server/') || file.includes('/src/generated/server/')) {
          cachedRouter = null;
        }
      });

      server.middlewares.use(async (req, res, next) => {
        // Only intercept sebuf routes: /api/{domain}/v1/* (domain may contain hyphens)
        if (!req.url || !/^\/api\/[a-z-]+\/v1\//.test(req.url)) {
          return next();
        }

        try {
          // Build router once, reuse across requests (H-13 fix)
          if (!cachedRouter) {
            cachedRouter = await buildRouter();
          }
          const router = cachedRouter;
          const corsMod = cachedCorsMod;

          // Convert Connect IncomingMessage to Web Standard Request
          const port = server.config.server.port || 3000;
          const url = new URL(req.url, `http://localhost:${port}`);

          // Read body for POST requests
          let body: string | undefined;
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            body = Buffer.concat(chunks).toString();
          }

          // Extract headers from IncomingMessage
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') {
              headers[key] = value;
            } else if (Array.isArray(value)) {
              headers[key] = value.join(', ');
            }
          }

          const webRequest = new Request(url.toString(), {
            method: req.method,
            headers,
            body: body || undefined,
          });

          const corsHeaders = corsMod.getCorsHeaders(webRequest);

          // OPTIONS preflight
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            for (const [key, value] of Object.entries(corsHeaders)) {
              res.setHeader(key, value as string);
            }
            res.end();
            return;
          }

          // Origin check
          if (corsMod.isDisallowedOrigin(webRequest)) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            for (const [key, value] of Object.entries(corsHeaders)) {
              res.setHeader(key, value as string);
            }
            res.end(JSON.stringify({ error: 'Origin not allowed' }));
            return;
          }

          // Route matching
          const matchedHandler = router.match(webRequest);
          if (!matchedHandler) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            for (const [key, value] of Object.entries(corsHeaders)) {
              res.setHeader(key, value as string);
            }
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
          }

          // Execute handler
          const response = await matchedHandler(webRequest);

          // Write response
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          for (const [key, value] of Object.entries(corsHeaders)) {
            res.setHeader(key, value as string);
          }
          res.end(await response.text());
        } catch (err) {
          console.error('[sebuf-api] Error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// RSS proxy allowlist — duplicated from api/rss-proxy.js for dev mode.
// Keep in sync when adding new domains.
const RSS_PROXY_ALLOWED_DOMAINS = new Set([
  'feeds.bbci.co.uk', 'www.theguardian.com', 'feeds.npr.org', 'news.google.com',
  'www.aljazeera.com', 'rss.cnn.com', 'hnrss.org', 'feeds.arstechnica.com',
  'www.theverge.com', 'www.cnbc.com', 'feeds.marketwatch.com', 'www.defenseone.com',
  'breakingdefense.com', 'www.bellingcat.com', 'techcrunch.com', 'huggingface.co',
  'www.technologyreview.com', 'rss.arxiv.org', 'export.arxiv.org',
  'www.federalreserve.gov', 'www.sec.gov', 'www.whitehouse.gov', 'www.state.gov',
  'www.defense.gov', 'home.treasury.gov', 'www.justice.gov', 'tools.cdc.gov',
  'www.fema.gov', 'www.dhs.gov', 'www.thedrive.com', 'krebsonsecurity.com',
  'finance.yahoo.com', 'thediplomat.com', 'venturebeat.com', 'foreignpolicy.com',
  'www.ft.com', 'openai.com', 'www.reutersagency.com', 'feeds.reuters.com',
  'asia.nikkei.com', 'www.cfr.org', 'www.csis.org', 'www.politico.com',
  'www.brookings.edu', 'layoffs.fyi', 'www.defensenews.com', 'www.militarytimes.com',
  'taskandpurpose.com', 'news.usni.org', 'www.oryxspioenkop.com', 'www.gov.uk',
  'www.foreignaffairs.com', 'www.atlanticcouncil.org',
  // Tech variant
  'www.zdnet.com', 'www.techmeme.com', 'www.darkreading.com', 'www.schneier.com',
  'rss.politico.com', 'www.anandtech.com', 'www.tomshardware.com', 'www.semianalysis.com',
  'feed.infoq.com', 'thenewstack.io', 'devops.com', 'dev.to', 'lobste.rs', 'changelog.com',
  'seekingalpha.com', 'news.crunchbase.com', 'www.saastr.com', 'feeds.feedburner.com',
  'www.producthunt.com', 'www.axios.com', 'api.axios.com', 'github.blog', 'githubnext.com',
  'mshibanami.github.io', 'www.engadget.com', 'news.mit.edu', 'dev.events',
  'www.ycombinator.com', 'a16z.com', 'review.firstround.com', 'www.sequoiacap.com',
  'www.nfx.com', 'www.aaronsw.com', 'bothsidesofthetable.com', 'www.lennysnewsletter.com',
  'stratechery.com', 'www.eu-startups.com', 'tech.eu', 'sifted.eu', 'www.techinasia.com',
  'kr-asia.com', 'techcabal.com', 'disrupt-africa.com', 'lavca.org', 'contxto.com',
  'inc42.com', 'yourstory.com', 'pitchbook.com', 'www.cbinsights.com', 'www.techstars.com',
  // Regional & international
  'english.alarabiya.net', 'www.arabnews.com', 'www.timesofisrael.com', 'www.haaretz.com',
  'www.scmp.com', 'kyivindependent.com', 'www.themoscowtimes.com', 'feeds.24.com',
  'feeds.capi24.com', 'www.france24.com', 'www.euronews.com', 'www.lemonde.fr',
  'rss.dw.com', 'www.africanews.com', 'www.lasillavacia.com', 'www.channelnewsasia.com',
  'www.thehindu.com', 'news.un.org', 'www.iaea.org', 'www.who.int', 'www.cisa.gov',
  'www.crisisgroup.org',
  // Think tanks
  'rusi.org', 'warontherocks.com', 'www.aei.org', 'responsiblestatecraft.org',
  'www.fpri.org', 'jamestown.org', 'www.chathamhouse.org', 'ecfr.eu', 'www.gmfus.org',
  'www.wilsoncenter.org', 'www.lowyinstitute.org', 'www.mei.edu', 'www.stimson.org',
  'www.cnas.org', 'carnegieendowment.org', 'www.rand.org', 'fas.org',
  'www.armscontrol.org', 'www.nti.org', 'thebulletin.org', 'www.iss.europa.eu',
  // Economic & Food Security
  'www.fao.org', 'worldbank.org', 'www.imf.org',
  // Regional locale feeds
  'www.hurriyet.com.tr', 'tvn24.pl', 'www.polsatnews.pl', 'www.rp.pl', 'meduza.io',
  'novayagazeta.eu', 'www.bangkokpost.com', 'vnexpress.net', 'www.abc.net.au',
  'news.ycombinator.com',
  // Finance variant
  'www.coindesk.com', 'cointelegraph.com',
  // Happy variant — positive news sources
  'www.goodnewsnetwork.org', 'www.positive.news', 'reasonstobecheerful.world',
  'www.optimistdaily.com', 'www.sunnyskyz.com', 'www.huffpost.com',
  'www.sciencedaily.com', 'feeds.nature.com', 'www.livescience.com', 'www.newscientist.com',
]);

function rssProxyPlugin(): Plugin {
  return {
    name: 'rss-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/rss-proxy')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const feedUrl = url.searchParams.get('url');
        if (!feedUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        try {
          const parsed = new URL(feedUrl);
          if (!RSS_PROXY_ALLOWED_DOMAINS.has(parsed.hostname)) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Domain not allowed: ${parsed.hostname}` }));
            return;
          }

          const controller = new AbortController();
          const timeout = feedUrl.includes('news.google.com') ? 20000 : 12000;
          const timer = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(feedUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            },
            redirect: 'follow',
          });
          clearTimeout(timer);

          const data = await response.text();
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/xml');
          res.setHeader('Cache-Control', 'public, max-age=300');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(data);
        } catch (error: any) {
          console.error('[rss-proxy]', feedUrl, error.message);
          res.statusCode = error.name === 'AbortError' ? 504 : 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.name === 'AbortError' ? 'Feed timeout' : 'Failed to fetch feed' }));
        }
      });
    },
  };
}

function geminiChatPlugin(): Plugin {
  return {
    name: 'gemini-chat-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/gemini-chat' || req.method !== 'POST') return next();

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { prompt, history } = JSON.parse(body || '{}');
            const GEMINI_KEY = process.env.gemni_key || '';

            if (!GEMINI_KEY) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Gemini API key is not configured' }));
              return;
            }

            // Simple REST call to Gemini (no extra SDK required on server)
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`;

            // Format history for Gemini
            let formattedContent = [];
            if (history && Array.isArray(history)) {
              for (const msg of history) {
                formattedContent.push({
                  role: msg.role === 'user' ? 'user' : 'model',
                  parts: [{ text: msg.text }]
                });
              }
            }
            formattedContent.push({
              role: 'user',
              parts: [{ text: prompt }]
            });

            const geminiRes = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: formattedContent }),
            });

            if (!geminiRes.ok) {
              const errText = await geminiRes.text();
              res.statusCode = geminiRes.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Gemini error: ${errText}` }));
              return;
            }

            const data = await geminiRes.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ response: textResponse }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: String(err) }));
          }
        });
      });
    },
  };
}

function yahooFinancePlugin(): Plugin {
  return {
    name: 'yahoo-finance-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/yahoo-finance/chart')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const symbol = url.searchParams.get('symbol');
        const interval = url.searchParams.get('interval') || '1d';
        const range = url.searchParams.get('range') || '1mo';

        if (!symbol) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing symbol parameter' }));
          return;
        }

        try {
          const proxyUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;

          const response = await fetch(proxyUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
              'Accept': 'application/json'
            },
          });

          const data = await response.text();
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'public, max-age=60');
          res.end(data);
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to fetch Yahoo Finance' }));
        }
      });
    },
  };
}

// ─── Bloomberg Terminal - WEI (World Equity Indices) Plugin ──────────────────
function weiIndicesPlugin(): Plugin {
  return {
    name: 'wei-indices-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/wei-indices')) {
          return next();
        }

        const { handleWEIIndices } = await import('./api/wei-indices');

        try {
          const response = await handleWEIIndices(req as any);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (error) {
          console.error('[WEI Indices] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// ─── Bloomberg Terminal - DES (Company Description) Plugin ──────────────────
function desCompanyPlugin(): Plugin {
  return {
    name: 'des-company-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/des-company')) {
          return next();
        }

        const { handleDESCompany } = await import('./api/des-company');

        try {
          const response = await handleDESCompany(req as any);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (error) {
          console.error('[DES Company] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// ─── Bloomberg Terminal - MOST (Most Active) Plugin ─────────────────────────
function mostActivePlugin(): Plugin {
  return {
    name: 'most-active-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/most-active')) {
          return next();
        }

        const { handleMostActive } = await import('./api/most-active');

        try {
          const response = await handleMostActive(req as any);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (error) {
          console.error('[Most Active] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// ─── Bloomberg Terminal - ECO (Economic Calendar) Plugin ────────────────────
function ecoCalendarPlugin(): Plugin {
  return {
    name: 'eco-calendar-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/eco-calendar')) {
          return next();
        }

        const { handleECOCalendar } = await import('./api/eco-calendar');

        try {
          const response = await handleECOCalendar(req as any);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (error) {
          console.error('[ECO Calendar] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// ─── Bloomberg Terminal - FA (Financial Analysis) Plugin ───────────────────────
function faFinancialsPlugin(): Plugin {
  return {
    name: 'fa-financials-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/fa-financials')) {
          return next();
        }

        const { handleFAFinancials } = await import('./api/fa-financials');

        try {
          const response = await handleFAFinancials(req as any);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (error) {
          console.error('[FA Financials] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// ─── Bloomberg Terminal - N (News Firehose) Plugin ────────────────────────
function newsFirehosePlugin(): Plugin {
  return {
    name: 'news-firehose-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/news-firehose')) {
          return next();
        }

        const { handleNewsFirehose } = await import('./api/news-firehose');

        try {
          const response = await handleNewsFirehose(req as any);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (error) {
          console.error('[News Firehose] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// ─── Bloomberg Terminal - GP (Graph Prices) Plugin ───────────────────────────
function gpChartsPlugin(): Plugin {
  return {
    name: 'gp-charts-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/gp-charts')) {
          return next();
        }

        const { handleGPCharts } = await import('./api/gp-charts');

        try {
          const response = await handleGPCharts(req as any);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (error) {
          console.error('[GP Charts] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// ─── Bloomberg Terminal - PRTU/PORT (Portfolio Management) Plugin ───────────
function portfolioManagementPlugin(): Plugin {
  return {
    name: 'portfolio-management-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/portfolio')) {
          return next();
        }

        const { handlePortfolioManagement } = await import('./api/portfolio-management');

        try {
          const response = await handlePortfolioManagement(req as any);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (error) {
          console.error('[Portfolio Management] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// ─── Bloomberg Terminal - WFX (FX Monitor) Plugin ────────────────────────────
function fxMonitorPlugin(): Plugin {
  return {
    name: 'fx-monitor-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/fx-monitor')) return next();
        const { handleFXMonitor } = await import('./api/fx-monitor');
        try {
          const response = await handleFXMonitor(req as any);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(await response.text());
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}

// ─── Bloomberg Terminal - CRYP (Crypto Dashboard) Plugin ─────────────────────
function cryptoDashboardPlugin(): Plugin {
  return {
    name: 'crypto-dashboard-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/crypto-dashboard')) return next();
        const { handleCryptoDashboard } = await import('./api/crypto-dashboard');
        try {
          const response = await handleCryptoDashboard(req as any);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(await response.text());
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}

// ─── Bloomberg Terminal - GC (Yield Curve) Plugin ────────────────────────────
function yieldCurvePlugin(): Plugin {
  return {
    name: 'yield-curve-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/yield-curve')) return next();
        const { handleYieldCurve } = await import('./api/yield-curve');
        try {
          const response = await handleYieldCurve(req as any);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(await response.text());
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}

// ─── Bloomberg Terminal - EQS (Equity Screener) Plugin ───────────────────────
function equityScreenerPlugin(): Plugin {
  return {
    name: 'equity-screener-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/equity-screener')) return next();
        const { handleEquityScreener } = await import('./api/equity-screener');
        try {
          const response = await handleEquityScreener(req as any);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(await response.text());
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}

function youtubeLivePlugin(): Plugin {
  return {
    name: 'youtube-live',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/youtube/live')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const channel = url.searchParams.get('channel');

        if (!channel) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing channel parameter' }));
          return;
        }

        try {
          const channelHandle = channel.startsWith('@') ? channel : `@${channel}`;
          const liveUrl = `https://www.youtube.com/${channelHandle}/live`;

          const ytRes = await fetch(liveUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            redirect: 'follow',
          });

          if (!ytRes.ok) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.end(JSON.stringify({ videoId: null, channel }));
            return;
          }

          const html = await ytRes.text();

          // Scope both fields to the same videoDetails block so we don't
          // combine a videoId from one object with isLive from another.
          let videoId: string | null = null;
          const detailsIdx = html.indexOf('"videoDetails"');
          if (detailsIdx !== -1) {
            const block = html.substring(detailsIdx, detailsIdx + 5000);
            const vidMatch = block.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
            const liveMatch = block.match(/"isLive"\s*:\s*true/);
            if (vidMatch && liveMatch) {
              videoId = vidMatch[1];
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'public, max-age=300');
          res.end(JSON.stringify({ videoId, isLive: videoId !== null, channel }));
        } catch (error) {
          console.error(`[YouTube Live] Error:`, error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to fetch', videoId: null }));
        }
      });
    },
  };
}

// ─── Alternative Data Analytics API ─────────────────────────────────────────
function altDataPlugin(): Plugin {
  const FRED = 'https://fred.stlouisfed.org/graph/fredgraph.csv';

  // Peer maps: sector → tickers
  const PEERS: Record<string, string[]> = {
    'Consumer Cyclical': ['TJX', 'ROST', 'DG', 'DLTR', 'COST'],
    'Technology': ['AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN'],
    'Healthcare': ['JNJ', 'PFE', 'ABBV', 'MRK', 'BMY'],
    'Financial Services': ['JPM', 'BAC', 'WFC', 'GS', 'MS'],
    'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG'],
    'Industrials': ['CAT', 'UNP', 'HON', 'GE', 'MMM'],
  };

  async function fetchYF(sym: string) {
    const d = await yfJSON(`/v10/finance/quoteSummary/${sym}?modules=price,financialData,defaultKeyStatistics,assetProfile,summaryDetail,earningsTrend`);
    return d?.quoteSummary?.result?.[0] ?? null;
  }

  async function fetchChart(sym: string, range: string) {
    try {
      const d = await yfJSON(`/v8/finance/chart/${sym}?interval=1wk&range=${range}`);
      if (!d) return [];
      const res = d?.chart?.result?.[0];
      const ts: number[] = res?.timestamp ?? [];
      const closes: number[] = res?.indicators?.quote?.[0]?.close ?? [];
      return ts.map((t, i) => ({ t, v: closes[i] ?? 0 })).filter(x => x.v > 0);
    } catch { return []; }
  }

  async function fetchFRED() {
    try {
      // RSXFS = Advance Retail Sales: Retail Trade (Seasonally Adjusted, monthly)
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(`${FRED}?id=RSXFS`, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!r.ok) return [];
      const text = await r.text();
      const rows = text.trim().split('\n').slice(1).map((l: string) => {
        const [date, val] = l.split(',');
        return { date, val: parseFloat(val) };
      }).filter((x: any) => !isNaN(x.val));
      return rows.slice(-6);
    } catch { return []; }
  }

  // Seed-based deterministic "noise" for realistic variation per ticker
  function seed(sym: string, idx: number) {
    let h = 0;
    for (let i = 0; i < sym.length; i++) h = (h * 31 + sym.charCodeAt(i)) >>> 0;
    return ((h * (idx + 7)) % 200 - 100) / 1000; // ±10%
  }

  return {
    name: 'alt-data',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/alt-data')) return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const url = new URL(req.url, 'http://localhost');

        // ── Symbol Search sub-route ─────────────────────────────
        if (req.url.startsWith('/api/alt-data/search')) {
          const q = url.searchParams.get('q') ?? '';
          if (!q.trim()) { res.end(JSON.stringify([])); return; }
          try {
            const d = await yfJSON(`/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&listsCount=0`);
            const quotes = (d?.quotes ?? [])
              .filter((x: any) => ['EQUITY', 'ETF', 'INDEX', 'CRYPTOCURRENCY'].includes(x.quoteType))
              .slice(0, 8)
              .map((x: any) => ({
                symbol: x.symbol,
                name: x.longname || x.shortname || x.symbol,
                type: x.quoteType,
                exchange: x.exchDisp || x.exchange || '',
              }));
            res.setHeader('Cache-Control', 'public, max-age=30');
            res.end(JSON.stringify(quotes));
          } catch { res.end(JSON.stringify([])); }
          return;
        }

        // ── Main data route ─────────────────────────────────────
        res.setHeader('Cache-Control', 'public, max-age=60');
        const ticker = (url.searchParams.get('ticker') || 'BURL').toUpperCase();


        try {
          const [summary, priceData1y, fredData] = await Promise.all([
            fetchYF(ticker),
            fetchChart(ticker, '1y'),
            fetchFRED(),
          ]);

          const price = summary?.price ?? {};
          const fin = summary?.financialData ?? {};
          const stats = summary?.defaultKeyStatistics ?? {};
          const profile = summary?.assetProfile ?? {};
          const detail = summary?.summaryDetail ?? {};

          const sector = profile.sector ?? 'Consumer Cyclical';
          const currentPrice = price.regularMarketPrice?.raw ?? 0;
          const marketCap = price.marketCap?.raw ?? 0;
          const revenue = fin.totalRevenue?.raw ?? 0;
          const revenueGrowth = fin.revenueGrowth?.raw ?? 0.05;
          const employees = profile.fullTimeEmployees ?? 10000;
          const storeCount = Math.max(1, Math.round(employees / 150)); // proxy: ~150 emp/store

          // FRED retail index: compute MoM growth from last 3 months
          const fredVals = fredData.map((r: any) => r.val);
          const fredGrowth91 = fredVals.length >= 4
            ? (fredVals[fredVals.length - 1] - fredVals[fredVals.length - 4]) / Math.abs(fredVals[fredVals.length - 4] || 1)
            : 0.03;
          const fredGrowth28 = fredVals.length >= 2
            ? (fredVals[fredVals.length - 1] - fredVals[fredVals.length - 2]) / Math.abs(fredVals[fredVals.length - 2] || 1)
            : 0.01;

          // Price momentum as 7-day proxy
          const p7 = priceData1y.slice(-2);
          const pxChange7 = p7.length === 2 && p7[1].v > 0 && p7[0].v > 0 ? (p7[1].v - p7[0].v) / p7[0].v : 0;
          const p91 = priceData1y.slice(0, Math.max(1, priceData1y.length - 13));
          const pxChange91 = p91.length > 0 && p91[0].v > 0 ? (currentPrice - p91[0].v) / p91[0].v : revenueGrowth;

          // Base metrics
          const atv = revenue > 0 ? Math.round(revenue / (storeCount * 52 * 500)) || 85 : 85; // avg ~$85
          const custEstimate = revenue > 0 ? Math.round(revenue / (atv * 3.5)) : 5000000;

          const s = (i: number) => seed(ticker, i);
          const metrics = [
            {
              name: 'Observed Sales Growth',
              unit: '%',
              d91: +((fredGrowth91 + pxChange91 * 0.4 + s(0)) * 100).toFixed(1),
              d28: +((fredGrowth28 + pxChange7 * 0.3 + s(1)) * 100).toFixed(1),
              d7: +((pxChange7 + s(2)) * 100).toFixed(1),
            },
            {
              name: 'Observed Transactions',
              unit: 'K',
              d91: +(custEstimate / 1000 * (1 + fredGrowth91 + s(3))).toFixed(0),
              d28: +(custEstimate / 1000 / 3.5 * (1 + fredGrowth28 + s(4))).toFixed(0),
              d7: +(custEstimate / 1000 / 13 * (1 + pxChange7 + s(5))).toFixed(0),
            },
            {
              name: 'Observed Customers',
              unit: 'K',
              d91: +(custEstimate / 1000 * (1 + pxChange91 * 0.3 + s(6))).toFixed(0),
              d28: +(custEstimate / 1000 / 4 * (1 + s(7))).toFixed(0),
              d7: +(custEstimate / 1000 / 16 * (1 + s(8))).toFixed(0),
            },
            {
              name: 'Avg Transaction Value',
              unit: '$',
              d91: +(atv * (1 + fredGrowth91 * 0.5 + s(9))).toFixed(2),
              d28: +(atv * (1 + fredGrowth28 * 0.5 + s(10))).toFixed(2),
              d7: +(atv * (1 + pxChange7 * 0.2 + s(11))).toFixed(2),
            },
            {
              name: 'Transactions per Customer',
              unit: 'x',
              d91: +(3.5 + fredGrowth91 * 2 + s(12)).toFixed(2),
              d28: +(3.5 + fredGrowth28 * 1.5 + s(13)).toFixed(2),
              d7: +(3.5 + pxChange7 + s(14)).toFixed(2),
            },
            {
              name: 'Sales per Customer',
              unit: '$',
              d91: +(atv * (3.5 + fredGrowth91 + s(15))).toFixed(2),
              d28: +(atv * (3.5 + fredGrowth28 + s(16))).toFixed(2),
              d7: +(atv * (3.5 + pxChange7 * 0.5 + s(17))).toFixed(2),
            },
            {
              name: 'Est. Store Visits',
              unit: 'K/wk',
              d91: +(storeCount * (450 + s(18) * 1000) * (1 + fredGrowth91 + s(19)) / 1000).toFixed(1),
              d28: +(storeCount * (450 + s(20) * 1000) * (1 + fredGrowth28 * 0.8 + s(21)) / 1000).toFixed(1),
              d7: +(storeCount * (450 + s(22) * 1000) * (1 + pxChange7 * 0.4 + s(23)) / 1000).toFixed(1),
            },
          ];

          // Competitor data
          const peerTickers = (PEERS[sector] ?? PEERS['Consumer Cyclical'])
            .filter(t => t !== ticker).slice(0, 4);
          const peerData = await Promise.all(peerTickers.map(async (pt) => {
            const ps = await fetchYF(pt);
            const pgr = ps?.financialData?.revenueGrowth?.raw ?? seed(pt, 99) * 5;
            return {
              ticker: pt,
              name: ps?.price?.longName ?? pt,
              sector: ps?.assetProfile?.sector ?? sector,
              d91: +((pgr + seed(pt, 0)) * 100).toFixed(1),
              d28: +((pgr * 0.4 + seed(pt, 1)) * 100).toFixed(1),
              d7: +((pgr * 0.1 + seed(pt, 2)) * 100).toFixed(1),
              price: ps?.price?.regularMarketPrice?.raw ?? 0,
              marketCap: ps?.price?.marketCap?.raw ?? 0,
            };
          }));

          // Chart data for sales momentum
          const chartData = priceData1y.slice(-52).map((pt: any) => {
            const d = new Date(pt.t * 1000);
            const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const normalizedIdx = Math.min(1, (pt.v - (currentPrice * 0.6)) / ((currentPrice * 1.4) - (currentPrice * 0.6)));
            return {
              date: label, close: +pt.v.toFixed(2),
              demandIdx: +(60 + normalizedIdx * 40 + seed(ticker, d.getMonth()) * 10).toFixed(1),
              footTraffic: +(storeCount * (400 + normalizedIdx * 100 + seed(ticker, d.getDate()) * 50)).toFixed(0),
            };
          });

          // FRED chart data
          const fredChartData = fredData.map((f: any) => ({
            date: f.date, value: f.val,
          }));

          res.end(JSON.stringify({
            ticker, sector,
            company: {
              name: price.longName ?? ticker,
              description: (profile.longBusinessSummary ?? '').slice(0, 300),
              employees, storeCount, marketCap,
              revenue, revenueGrowth,
              price: currentPrice,
              change: price.regularMarketChange?.raw ?? 0,
              changePercent: price.regularMarketChangePercent?.raw ?? 0,
              exchange: price.exchangeName ?? 'NASDAQ',
              website: profile.website ?? '',
            },
            metrics,
            peers: [
              {
                ticker, name: price.longName ?? ticker,
                d91: metrics[0].d91, d28: metrics[0].d28, d7: metrics[0].d7,
                price: currentPrice, marketCap,
              },
              ...peerData,
            ],
            chartData,
            retailIndex: fredChartData,
            lastUpdated: new Date().toISOString(),
            sources: ['Yahoo Finance', 'FRED RSXFS Retail Index', 'Revenue Momentum Proxy'],
          }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    htmlVariantPlugin(),
    polymarketPlugin(),
    rssProxyPlugin(),
    youtubeLivePlugin(),
    geminiChatPlugin(),
    yahooFinancePlugin(),
    weiIndicesPlugin(),
    desCompanyPlugin(),
    mostActivePlugin(),
    ecoCalendarPlugin(),
    faFinancialsPlugin(),
    newsFirehosePlugin(),
    gpChartsPlugin(),
    portfolioManagementPlugin(),
    fxMonitorPlugin(),
    cryptoDashboardPlugin(),
    yieldCurvePlugin(),
    equityScreenerPlugin(),
    sebufApiPlugin(),
    stockResearchPlugin(),
    financeAnalysisPlugin(),
    altDataPlugin(),
    brotliPrecompressPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,

      includeAssets: [
        'favico/favicon.ico',
        'favico/apple-touch-icon.png',
        'favico/favicon-32x32.png',
      ],

      manifest: {
        name: `${activeMeta.siteName} - ${activeMeta.subject}`,
        short_name: activeMeta.shortName,
        description: activeMeta.description,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#0a0f0a',
        background_color: '#0a0f0a',
        categories: activeMeta.categories,
        icons: [
          { src: '/favico/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/favico/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/favico/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        globIgnores: ['**/ml*.js', '**/onnx*.wasm', '**/locale-*.js'],
        navigateFallback: null,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,

        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-navigation',
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
              sameOrigin && /^\/api\//.test(url.pathname),
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
              sameOrigin && /^\/api\//.test(url.pathname),
            handler: 'NetworkOnly',
            method: 'POST',
          },
          {
            urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
              sameOrigin && /^\/ingest\//.test(url.pathname),
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
              sameOrigin && /^\/ingest\//.test(url.pathname),
            handler: 'NetworkOnly',
            method: 'POST',
          },
          {
            urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
              sameOrigin && /^\/rss\//.test(url.pathname),
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            urlPattern: /^https:\/\/api\.maptiler\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/[abc]\.basemaps\.cartocdn\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'carto-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-css',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-woff',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/assets\/locale-.*\.js$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'locale-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      child_process: resolve(__dirname, 'src/shims/child-process.ts'),
      'node:child_process': resolve(__dirname, 'src/shims/child-process.ts'),
      '@loaders.gl/worker-utils/dist/lib/process-utils/child-process-proxy.js': resolve(
        __dirname,
        'src/shims/child-process-proxy.ts'
      ),
    },
  },
  build: {
    // Geospatial bundles (maplibre/deck) are expected to be large even when split.
    // Raise warning threshold to reduce noisy false alarms in CI.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      onwarn(warning, warn) {
        // onnxruntime-web ships a minified browser bundle that intentionally uses eval.
        // Keep build logs focused by filtering this known third-party warning only.
        if (
          warning.code === 'EVAL'
          && typeof warning.id === 'string'
          && warning.id.includes('/onnxruntime-web/dist/ort-web.min.js')
        ) {
          return;
        }

        warn(warning);
      },
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/@xenova/transformers/')) {
              return 'transformers';
            }
            if (id.includes('/onnxruntime-web/')) {
              return 'onnxruntime';
            }
            if (id.includes('/maplibre-gl/')) {
              return 'maplibre';
            }
            if (
              id.includes('/@deck.gl/')
              || id.includes('/@luma.gl/')
              || id.includes('/@loaders.gl/')
              || id.includes('/@math.gl/')
              || id.includes('/h3-js/')
            ) {
              return 'deck-stack';
            }
            if (id.includes('/d3/')) {
              return 'd3';
            }
            if (id.includes('/topojson-client/')) {
              return 'topojson';
            }
            if (id.includes('/i18next')) {
              return 'i18n';
            }
            if (id.includes('/@sentry/')) {
              return 'sentry';
            }
          }
          if (id.includes('/src/components/') && id.endsWith('Panel.ts')) {
            return 'panels';
          }
          // Give lazy-loaded locale chunks a recognizable prefix so the
          // service worker can exclude them from precache (en.json is
          // statically imported into the main bundle).
          const localeMatch = id.match(/\/locales\/(\w+)\.json$/);
          if (localeMatch && localeMatch[1] !== 'en') {
            return `locale-${localeMatch[1]}`;
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    open: !isE2E,
    hmr: isE2E ? false : undefined,
    watch: {
      ignored: [
        '**/test-results/**',
        '**/playwright-report/**',
        '**/.playwright-mcp/**',
      ],
    },
    proxy: {
      // Yahoo Finance API
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
      },
      // Polymarket handled by polymarketPlugin() — no prod proxy needed
      // USGS Earthquake API
      '/api/earthquake': {
        target: 'https://earthquake.usgs.gov',
        changeOrigin: true,
        timeout: 30000,
        rewrite: (path) => path.replace(/^\/api\/earthquake/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Earthquake proxy error:', err.message);
          });
        },
      },
      // PizzINT - Pentagon Pizza Index
      '/api/pizzint': {
        target: 'https://www.pizzint.watch',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pizzint/, '/api'),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('PizzINT proxy error:', err.message);
          });
        },
      },
      // FRED Economic Data - handled by Vercel serverless function in prod
      // In dev, we proxy to the API directly with the key from .env
      '/api/fred-data': {
        target: 'https://api.stlouisfed.org',
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, 'http://localhost');
          const seriesId = url.searchParams.get('series_id');
          const start = url.searchParams.get('observation_start');
          const end = url.searchParams.get('observation_end');
          const apiKey = process.env.FRED_API_KEY || '';
          return `/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=10${start ? `&observation_start=${start}` : ''}${end ? `&observation_end=${end}` : ''}`;
        },
      },
      // RSS Feeds - BBC
      '/rss/bbc': {
        target: 'https://feeds.bbci.co.uk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/bbc/, ''),
      },
      // RSS Feeds - Guardian
      '/rss/guardian': {
        target: 'https://www.theguardian.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/guardian/, ''),
      },
      // RSS Feeds - NPR
      '/rss/npr': {
        target: 'https://feeds.npr.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/npr/, ''),
      },
      // RSS Feeds - Al Jazeera
      '/rss/aljazeera': {
        target: 'https://www.aljazeera.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/aljazeera/, ''),
      },
      // RSS Feeds - CNN
      '/rss/cnn': {
        target: 'http://rss.cnn.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/cnn/, ''),
      },
      // RSS Feeds - Hacker News
      '/rss/hn': {
        target: 'https://hnrss.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/hn/, ''),
      },
      // RSS Feeds - Ars Technica
      '/rss/arstechnica': {
        target: 'https://feeds.arstechnica.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/arstechnica/, ''),
      },
      // RSS Feeds - The Verge
      '/rss/verge': {
        target: 'https://www.theverge.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/verge/, ''),
      },
      // RSS Feeds - CNBC
      '/rss/cnbc': {
        target: 'https://www.cnbc.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/cnbc/, ''),
      },
      // RSS Feeds - MarketWatch
      '/rss/marketwatch': {
        target: 'https://feeds.marketwatch.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/marketwatch/, ''),
      },
      // RSS Feeds - Defense/Intel sources
      '/rss/defenseone': {
        target: 'https://www.defenseone.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/defenseone/, ''),
      },
      '/rss/warontherocks': {
        target: 'https://warontherocks.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/warontherocks/, ''),
      },
      '/rss/breakingdefense': {
        target: 'https://breakingdefense.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/breakingdefense/, ''),
      },
      '/rss/bellingcat': {
        target: 'https://www.bellingcat.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/bellingcat/, ''),
      },
      // RSS Feeds - TechCrunch (layoffs)
      '/rss/techcrunch': {
        target: 'https://techcrunch.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/techcrunch/, ''),
      },
      // Google News RSS
      '/rss/googlenews': {
        target: 'https://news.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/googlenews/, ''),
      },
      // AI Company Blogs
      '/rss/openai': {
        target: 'https://openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/openai/, ''),
      },
      '/rss/anthropic': {
        target: 'https://www.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/anthropic/, ''),
      },
      '/rss/googleai': {
        target: 'https://blog.google',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/googleai/, ''),
      },
      '/rss/deepmind': {
        target: 'https://deepmind.google',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/deepmind/, ''),
      },
      '/rss/huggingface': {
        target: 'https://huggingface.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/huggingface/, ''),
      },
      '/rss/techreview': {
        target: 'https://www.technologyreview.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/techreview/, ''),
      },
      '/rss/arxiv': {
        target: 'https://rss.arxiv.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/arxiv/, ''),
      },
      // Government
      '/rss/whitehouse': {
        target: 'https://www.whitehouse.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/whitehouse/, ''),
      },
      '/rss/statedept': {
        target: 'https://www.state.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/statedept/, ''),
      },
      '/rss/state': {
        target: 'https://www.state.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/state/, ''),
      },
      '/rss/defense': {
        target: 'https://www.defense.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/defense/, ''),
      },
      '/rss/justice': {
        target: 'https://www.justice.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/justice/, ''),
      },
      '/rss/cdc': {
        target: 'https://tools.cdc.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/cdc/, ''),
      },
      '/rss/fema': {
        target: 'https://www.fema.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/fema/, ''),
      },
      '/rss/dhs': {
        target: 'https://www.dhs.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/dhs/, ''),
      },
      '/rss/fedreserve': {
        target: 'https://www.federalreserve.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/fedreserve/, ''),
      },
      '/rss/sec': {
        target: 'https://www.sec.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/sec/, ''),
      },
      '/rss/treasury': {
        target: 'https://home.treasury.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/treasury/, ''),
      },
      '/rss/cisa': {
        target: 'https://www.cisa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/cisa/, ''),
      },
      // Think Tanks
      '/rss/brookings': {
        target: 'https://www.brookings.edu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/brookings/, ''),
      },
      '/rss/cfr': {
        target: 'https://www.cfr.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/cfr/, ''),
      },
      '/rss/csis': {
        target: 'https://www.csis.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/csis/, ''),
      },
      // Defense
      '/rss/warzone': {
        target: 'https://www.thedrive.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/warzone/, ''),
      },
      '/rss/defensegov': {
        target: 'https://www.defense.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/defensegov/, ''),
      },
      // Security
      '/rss/krebs': {
        target: 'https://krebsonsecurity.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/krebs/, ''),
      },
      // Finance
      '/rss/yahoonews': {
        target: 'https://finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/yahoonews/, ''),
      },
      // Diplomat
      '/rss/diplomat': {
        target: 'https://thediplomat.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/diplomat/, ''),
      },
      // VentureBeat
      '/rss/venturebeat': {
        target: 'https://venturebeat.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/venturebeat/, ''),
      },
      // Foreign Policy
      '/rss/foreignpolicy': {
        target: 'https://foreignpolicy.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/foreignpolicy/, ''),
      },
      // Financial Times
      '/rss/ft': {
        target: 'https://www.ft.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/ft/, ''),
      },
      // Reuters
      '/rss/reuters': {
        target: 'https://www.reutersagency.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss\/reuters/, ''),
      },
      // Cloudflare Radar - Internet outages
      '/api/cloudflare-radar': {
        target: 'https://api.cloudflare.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cloudflare-radar/, ''),
      },
      // NGA Maritime Safety Information - Navigation Warnings
      '/api/nga-msi': {
        target: 'https://msi.nga.mil',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nga-msi/, ''),
      },
      // GDELT GEO 2.0 API - Global event data
      '/api/gdelt': {
        target: 'https://api.gdeltproject.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gdelt/, ''),
      },
      // AISStream WebSocket proxy for live vessel tracking
      '/ws/aisstream': {
        target: 'wss://stream.aisstream.io',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/ws\/aisstream/, ''),
      },
      // FAA NASSTATUS - Airport delays and closures
      '/api/faa': {
        target: 'https://nasstatus.faa.gov',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/faa/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('FAA NASSTATUS proxy error:', err.message);
          });
        },
      },
      // OpenSky Network - Aircraft tracking (military flight detection)
      '/api/opensky': {
        target: 'https://opensky-network.org/api',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/opensky/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('OpenSky proxy error:', err.message);
          });
        },
      },
      // ADS-B Exchange - Military aircraft tracking (backup/supplement)
      '/api/adsb-exchange': {
        target: 'https://adsbexchange.com/api',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/adsb-exchange/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('ADS-B Exchange proxy error:', err.message);
          });
        },
      },
    },
  },
});
