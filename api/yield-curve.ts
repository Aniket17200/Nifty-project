/**
 * Bloomberg Terminal - GC (Yield Curve) API Endpoint
 * Fetches US Treasury yield curve data
 * Called from: /api/yield-curve
 * Source: US Treasury Department (fiscal.treasury.gov - completely free, no key)
 *         with FRED API fallback if key configured
 */

interface TreasuryRate {
    maturity: string;
    label: string;
    years: number;
    rate: number | null;
}

// FRED series IDs for US Treasury yields
const FRED_SERIES = [
    { id: 'DGS1MO', maturity: '1M', label: '1-Month', years: 1 / 12 },
    { id: 'DGS3MO', maturity: '3M', label: '3-Month', years: 0.25 },
    { id: 'DGS6MO', maturity: '6M', label: '6-Month', years: 0.5 },
    { id: 'DGS1', maturity: '1Y', label: '1-Year', years: 1 },
    { id: 'DGS2', maturity: '2Y', label: '2-Year', years: 2 },
    { id: 'DGS3', maturity: '3Y', label: '3-Year', years: 3 },
    { id: 'DGS5', maturity: '5Y', label: '5-Year', years: 5 },
    { id: 'DGS7', maturity: '7Y', label: '7-Year', years: 7 },
    { id: 'DGS10', maturity: '10Y', label: '10-Year', years: 10 },
    { id: 'DGS20', maturity: '20Y', label: '20-Year', years: 20 },
    { id: 'DGS30', maturity: '30Y', label: '30-Year', years: 30 },
];

async function fetchFromTreasuryGov(): Promise<TreasuryRate[] | null> {
    try {
        // US Treasury Fiscal Data API - completely free, no auth
        const today = new Date();
        const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // last 7 days
        const fmt = (d: Date) => d.toISOString().split('T')[0];

        const res = await fetch(
            `https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/avg_interest_rates?fields=record_date,security_desc,avg_interest_rate_amt&filter=record_date:gte:${fmt(startDate)}&sort=-record_date&page[size]=50`,
            { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bloomberg-Terminal/1.0)', Accept: 'application/json' } }
        );
        if (!res.ok) return null;
        const data = await res.json() as { data?: Array<{ security_desc: string; avg_interest_rate_amt: string }> };
        if (!data.data?.length) return null;

        // Map security descriptions to our maturities
        const maturityMap: Record<string, number> = {
            '1-Month': 0, '3-Month': 1, '6-Month': 2, '1-Year': 3,
            '2-Year': 4, '3-Year': 5, '5-Year': 6, '7-Year': 7,
            '10-Year': 8, '20-Year': 9, '30-Year': 10,
        };

        const seen = new Set<number>();
        const rates: (TreasuryRate | null)[] = new Array(FRED_SERIES.length).fill(null);

        for (const item of data.data) {
            const desc = item.security_desc;
            const idx = Object.entries(maturityMap).find(([key]) => desc.includes(key))?.[1];
            if (idx !== undefined && !seen.has(idx)) {
                seen.add(idx);
                const s = FRED_SERIES[idx];
                rates[idx] = {
                    maturity: s.maturity,
                    label: s.label,
                    years: s.years,
                    rate: parseFloat(item.avg_interest_rate_amt),
                };
            }
        }

        const valid = rates.filter(Boolean) as TreasuryRate[];
        return valid.length >= 4 ? valid : null;
    } catch {
        return null;
    }
}

async function fetchFromFRED(fredKey: string): Promise<TreasuryRate[] | null> {
    try {
        const results = await Promise.all(
            FRED_SERIES.map(async (s) => {
                const res = await fetch(
                    `https://api.stlouisfed.org/fred/series/observations?series_id=${s.id}&api_key=${fredKey}&file_type=json&sort_order=desc&limit=1`,
                    { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bloomberg-Terminal/1.0)' } }
                );
                if (!res.ok) return null;
                const data = await res.json() as { observations?: Array<{ value: string }> };
                const val = data.observations?.[0]?.value;
                return {
                    maturity: s.maturity,
                    label: s.label,
                    years: s.years,
                    rate: val && val !== '.' ? parseFloat(val) : null,
                };
            })
        );
        return results.filter((r): r is TreasuryRate => r !== null);
    } catch {
        return null;
    }
}

// Fallback: recent static data (approximated from public sources)
function getStaticFallback(): TreasuryRate[] {
    return [
        { maturity: '1M', label: '1-Month', years: 1 / 12, rate: 4.32 },
        { maturity: '3M', label: '3-Month', years: 0.25, rate: 4.34 },
        { maturity: '6M', label: '6-Month', years: 0.5, rate: 4.31 },
        { maturity: '1Y', label: '1-Year', years: 1, rate: 4.20 },
        { maturity: '2Y', label: '2-Year', years: 2, rate: 4.18 },
        { maturity: '3Y', label: '3-Year', years: 3, rate: 4.22 },
        { maturity: '5Y', label: '5-Year', years: 5, rate: 4.30 },
        { maturity: '7Y', label: '7-Year', years: 7, rate: 4.40 },
        { maturity: '10Y', label: '10-Year', years: 10, rate: 4.47 },
        { maturity: '20Y', label: '20-Year', years: 20, rate: 4.73 },
        { maturity: '30Y', label: '30-Year', years: 30, rate: 4.65 },
    ];
}

export async function handleYieldCurve(req: Request): Promise<Response> {
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

    const FRED_KEY = process.env.FRED_API_KEY ?? '';
    let rates: TreasuryRate[] | null = null;
    let source = 'static';

    // 1. Try FRED if key available
    if (FRED_KEY) {
        rates = await fetchFromFRED(FRED_KEY);
        if (rates) source = 'fred';
    }

    // 2. Try Treasury.gov public API
    if (!rates) {
        rates = await fetchFromTreasuryGov();
        if (rates) source = 'treasury_gov';
    }

    // 3. Fall back to static data
    if (!rates || rates.length < 4) {
        rates = getStaticFallback();
        source = 'static_fallback';
    }

    // Calculate spread (10Y - 2Y: key recession indicator)
    const rate10y = rates.find(r => r.maturity === '10Y')?.rate ?? 0;
    const rate2y = rates.find(r => r.maturity === '2Y')?.rate ?? 0;
    const rate3m = rates.find(r => r.maturity === '3M')?.rate ?? 0;
    const spread10y2y = rate10y && rate2y ? rate10y - rate2y : null;
    const spread10y3m = rate10y && rate3m ? rate10y - rate3m : null;

    return new Response(JSON.stringify({
        rates,
        spreads: {
            '10Y-2Y': spread10y2y,
            '10Y-3M': spread10y3m,
            inverted: spread10y2y !== null ? spread10y2y < 0 : false,
        },
        source,
        lastUpdated: new Date().toISOString(),
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
