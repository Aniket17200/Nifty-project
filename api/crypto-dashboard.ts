/**
 * Bloomberg Terminal - CRYP (Crypto Dashboard) API Endpoint
 * Fetches live cryptocurrency data
 * Called from: /api/crypto-dashboard
 * Source: CoinGecko API (completely free, no key required)
 */

export async function handleCryptoDashboard(req: Request): Promise<Response> {
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
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 50);

    try {
        // Fetch top coins from CoinGecko (no API key needed)
        const [coinsRes, globalRes] = await Promise.all([
            fetch(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h,7d`,
                { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bloomberg-Terminal/1.0)', 'Accept': 'application/json' } }
            ),
            fetch('https://api.coingecko.com/api/v3/global', {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bloomberg-Terminal/1.0)', 'Accept': 'application/json' },
            }),
        ]);

        const coins = coinsRes.ok ? await coinsRes.json() : [];
        const globalRaw = globalRes.ok ? await globalRes.json() : {};
        const globalData = (globalRaw as any)?.data ?? {};

        // Format coins
        const formattedCoins = (coins as any[]).map((coin: any) => ({
            id: coin.id,
            symbol: coin.symbol?.toUpperCase(),
            name: coin.name,
            image: coin.image,
            price: coin.current_price,
            marketCap: coin.market_cap,
            volume24h: coin.total_volume,
            change24h: coin.price_change_percentage_24h ?? 0,
            change7d: coin.price_change_percentage_7d_in_currency ?? 0,
            rank: coin.market_cap_rank,
            circulatingSupply: coin.circulating_supply,
            ath: coin.ath,
            athChangePercent: coin.ath_change_percentage,
        }));

        const globalStats = {
            totalMarketCap: globalData.total_market_cap?.usd ?? 0,
            totalVolume24h: globalData.total_volume?.usd ?? 0,
            btcDominance: globalData.market_cap_percentage?.btc ?? 0,
            ethDominance: globalData.market_cap_percentage?.eth ?? 0,
            activeCryptocurrencies: globalData.active_cryptocurrencies ?? 0,
            marketCapChangePercent24h: globalData.market_cap_change_percentage_24h_usd ?? 0,
        };

        return new Response(JSON.stringify({
            coins: formattedCoins,
            global: globalStats,
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
        return new Response(JSON.stringify({ error: 'Failed to fetch crypto data', details: String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
