/**
 * Stock Research API endpoint
 * Called from: /api/stock-research (Vite dev proxy / Vercel serverless)
 * Uses Perplexity AI (llama-3.1-sonar-large-128k-online) for real-time equity research
 */

const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY || '';
const PERPLEXITY_API = 'https://api.perplexity.ai/chat/completions';

export async function handleStockResearch(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    let body: { ticker?: string; name?: string };
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
    }

    const query = ((body.ticker ?? body.name ?? '').trim()).toUpperCase();
    if (!query) {
        return new Response(JSON.stringify({ error: 'Missing stock ticker or name' }), { status: 400 });
    }

    const prompt = `You are a professional financial analyst with access to real-time market data. Provide a comprehensive stock research report for "${query}".

Include ALL of the following sections:

## 1. Company Overview
- Full company name, sector, industry, headquarters
- Business model and core revenue streams
- Key products/services and market position

## 2. Current Price & Valuation Metrics
- Latest stock price and market cap
- P/E ratio, Forward P/E, EPS (TTM and forward)
- Price/Book, Price/Sales, EV/EBITDA
- Dividend yield and payout ratio
- 52-week high/low range

## 3. Financial Performance
- Last 4 quarters revenue trend (with growth rates)
- Net income / EPS trend
- Gross margin, operating margin, net profit margin
- Free cash flow and debt-to-equity ratio
- Balance sheet health (cash vs debt)

## 4. Technical Analysis
- Current price trend (bullish/bearish/consolidating)
- Key support levels and resistance levels
- RSI (overbought/oversold), MACD signal
- Moving averages (50-day, 200-day) status
- Volume trend and institutional buying/selling

## 5. Bull Case — Why to BUY 🐂
- Top 3-5 growth catalysts
- Competitive moat and advantages
- Upcoming catalysts (earnings, product launches, contracts)
- Total addressable market opportunity

## 6. Bear Case — Why to AVOID/SELL 🐻
- Top 3-5 headwinds and risks
- Competitive threats
- Valuation concerns (if any)
- Regulatory or macro risks

## 7. Analyst Consensus & Price Targets
- Current analyst rating distribution (Strong Buy/Buy/Hold/Sell/Strong Sell)
- Average 12-month price target
- Highest and lowest price targets
- Number of analysts covering this stock

## 8. AI Investment Verdict 🤖
- Overall recommendation (Strong Buy / Buy / Hold / Sell / Strong Sell)
- 6-month price target
- 12-month price target
- Risk level (Low / Medium / High / Very High)
- Best suited for (Growth investors / Value investors / Income investors / Traders)
- Key metrics to watch going forward

Be specific with numbers, percentages, and price levels. Use real market data where possible.`;

    try {
        const response = await fetch(PERPLEXITY_API, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-sonar-large-128k-online',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert financial analyst with access to real-time market data, earnings reports, analyst ratings, and technical indicators. Provide detailed, accurate, and actionable stock research reports with specific data points and numbers.',
                    },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 4096,
                temperature: 0.2,
                return_citations: true,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            return new Response(JSON.stringify({ error: `Perplexity API error (${response.status}): ${errText}` }), { status: response.status });
        }

        const data = await response.json() as {
            choices?: Array<{ message?: { content?: string } }>;
            citations?: string[];
        };
        const content = data.choices?.[0]?.message?.content ?? '';
        const citations = data.citations ?? [];

        return new Response(JSON.stringify({ content, citations, ticker: query }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300',
            },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
    }
}
