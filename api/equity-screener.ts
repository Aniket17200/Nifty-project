/**
 * Bloomberg Terminal - EQS (Equity Screener) API Endpoint
 * Fetches gainers, losers, and filtered stock lists
 * Called from: /api/equity-screener
 * Source: Yahoo Finance (no key required)
 */

interface ScreenerStock {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap: number;
    pe?: number;
    sector?: string;
}

const SCREENER_TYPES: Record<string, string> = {
    gainers: 'day_gainers',
    losers: 'day_losers',
    active: 'most_actives',
    tech: 'growth_technology_stocks',
    value: 'undervalued_large_caps',
    dividend: 'highest_yielding_dividend',
    smallcap: 'small_cap_gainers',
    momentum: 'strong_long_term_momentum',
};

async function fetchYahooScreener(screenerType: string, count: number): Promise<ScreenerStock[]> {
    const yahooType = SCREENER_TYPES[screenerType] ?? SCREENER_TYPES.active;

    try {
        const res = await fetch(
            `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=${yahooType}&count=${count}`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                },
            }
        );

        if (!res.ok) throw new Error(`Yahoo Finance screener returned ${res.status}`);

        const data = await res.json() as any;
        const quotes = data?.finance?.result?.[0]?.quotes ?? [];

        return quotes.map((q: any): ScreenerStock => ({
            symbol: q.symbol,
            name: q.longName || q.shortName || q.symbol,
            price: q.regularMarketPrice ?? 0,
            change: q.regularMarketChange ?? 0,
            changePercent: q.regularMarketChangePercent ?? 0,
            volume: q.regularMarketVolume ?? 0,
            marketCap: q.marketCap ?? 0,
            pe: q.trailingPE ?? undefined,
            sector: q.sector ?? undefined,
        }));
    } catch (err) {
        console.error(`[Equity Screener] Failed to fetch ${screenerType}:`, err);
        return [];
    }
}

export async function handleEquityScreener(req: Request): Promise<Response> {
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

    const url = new URL(req.url, 'http://localhost:3000');
    const type = url.searchParams.get('type') ?? 'gainers';
    const count = Math.min(parseInt(url.searchParams.get('count') ?? '25', 10), 50);

    const allowed = new Set(Object.keys(SCREENER_TYPES));
    const safeType = allowed.has(type) ? type : 'gainers';

    try {
        const stocks = await fetchYahooScreener(safeType, count);

        return new Response(JSON.stringify({
            type: safeType,
            stocks,
            count: stocks.length,
            availableTypes: Object.keys(SCREENER_TYPES),
            lastUpdated: new Date().toISOString(),
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch screener data', details: String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
