/**
 * Bloomberg Terminal - N (News Firehose) API Endpoint
 * Aggregates real-time news with sentiment analysis
 * Called from: /api/news-firehose
 * Source: RSS Feeds (Reuters, CNBC, Bloomberg public), SEC filings
 */

interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  tickers: string[];
  category: 'Earnings' | 'M&A' | 'Macro' | 'Company-Specific' | 'Regulatory' | 'Technology' | 'Commodities' | 'Other';
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1 to 1
  impact: 'High' | 'Medium' | 'Low';
}

interface NewsResponse {
  items: NewsItem[];
  summary: {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    highImpact: number;
    categories: { name: string; count: number }[];
  };
  lastUpdated: string;
}

// Mock news data with sentiment (in production, fetch from RSS feeds)
const MOCK_NEWS_ITEMS: NewsItem[] = [
  {
    id: '1',
    headline: 'Federal Reserve signals potential rate cuts in 2024 as inflation shows signs of cooling',
    summary: 'The Federal Reserve indicated it may begin cutting interest rates this year as consumer price inflation continues to moderate, according to minutes from the latest FOMC meeting.',
    source: 'Reuters',
    sourceUrl: 'https://reuters.com/business/fed-rates-2024',
    publishedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    tickers: ['SPY', 'TLT', 'QQQ', 'IWM'],
    category: 'Macro',
    sentiment: 'positive',
    sentimentScore: 0.7,
    impact: 'High',
  },
  {
    id: '2',
    headline: 'NVIDIA unveils new AI chip architecture, stock surges 5% in pre-market',
    summary: 'NVIDIA announced its next-generation AI chip architecture, claiming 3x performance improvements over current models. Analysts upgrade price targets.',
    source: 'CNBC',
    sourceUrl: 'https://cnbc.com/2024/03/01/nvidia-ai-chip',
    publishedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    tickers: ['NVDA', 'AMD', 'INTC'],
    category: 'Technology',
    sentiment: 'positive',
    sentimentScore: 0.9,
    impact: 'High',
  },
  {
    id: '3',
    headline: 'Tesla recalls 2M vehicles over Autopilot safety concerns, faces NHTSA investigation',
    summary: 'Tesla is recalling nearly 2 million vehicles in the US due to concerns about Autopilot\'s ability to detect parked emergency vehicles.',
    source: 'Bloomberg',
    sourceUrl: 'https://bloomberg.com/news/tesla-recall',
    publishedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    tickers: ['TSLA'],
    category: 'Company-Specific',
    sentiment: 'negative',
    sentimentScore: -0.8,
    impact: 'High',
  },
  {
    id: '4',
    headline: 'China manufacturing PMI falls short of expectations at 49.2',
    summary: 'China\'s official manufacturing PMI came in at 49.2 for February, below analyst expectations of 50.5, signaling contraction in the sector.',
    source: 'Financial Times',
    sourceUrl: 'https://ft.com/china-pmi-feb-2024',
    publishedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    tickers: ['FXI', 'MCHI', 'ASHR'],
    category: 'Macro',
    sentiment: 'negative',
    sentimentScore: -0.5,
    impact: 'Medium',
  },
  {
    id: '5',
    headline: 'Apple announces new iPad lineup with integrated AI features',
    summary: 'Apple unveiled its next-generation iPad Pro models featuring M3 chips and integrated AI capabilities for productivity and creative work.',
    source: 'The Verge',
    sourceUrl: 'https://theverge.com/apple-ipad-m3-ai',
    publishedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    tickers: ['AAPL'],
    category: 'Technology',
    sentiment: 'positive',
    sentimentScore: 0.6,
    impact: 'Medium',
  },
  {
    id: '6',
    headline: 'Oil prices surge 3% on OPEC+ production cut announcement',
    summary: 'OPEC+ members agreed to extend production cuts through Q2 2024, tightening global supply and pushing crude prices higher.',
    source: 'Reuters',
    sourceUrl: 'https://reuters.com/commodities/oil-opec',
    publishedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    tickers: ['USO', 'XLE', 'CVX', 'XOM'],
    category: 'Commodities',
    sentiment: 'positive',
    sentimentScore: 0.4,
    impact: 'Medium',
  },
  {
    id: '7',
    headline: 'SEC expands investigation into major tech companies\' cloud practices',
    summary: 'The Securities and Exchange Commission has broadened its probe into how Amazon, Microsoft, and Google structure their cloud computing businesses.',
    source: 'Wall Street Journal',
    sourceUrl: 'https://wsj.com/sec-cloud-investigation',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    tickers: ['AMZN', 'MSFT', 'GOOGL'],
    category: 'Regulatory',
    sentiment: 'negative',
    sentimentScore: -0.6,
    impact: 'High',
  },
  {
    id: '8',
    headline: 'Merger talks between Disney and Comcast streaming assets heat up',
    summary: 'Disney and Comcast are in advanced discussions about combining their streaming assets to create a larger competitor to Netflix.',
    source: 'CNBC',
    sourceUrl: 'https://cnbc.com/disney-comcast-merger',
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    tickers: ['DIS', 'CMCSA', 'NFLX'],
    category: 'M&A',
    sentiment: 'neutral',
    sentimentScore: 0.1,
    impact: 'High',
  },
  {
    id: '9',
    headline: 'JPMorgan reports Q4 earnings beat estimates on strong investment banking',
    summary: 'JPMorgan Chase reported better-than-expected quarterly earnings, driven by a resurgence in investment banking activity.',
    source: 'Bloomberg',
    sourceUrl: 'https://bloomberg.com/jpm-q4-earnings',
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    tickers: ['JPM', 'BAC', 'WFC'],
    category: 'Earnings',
    sentiment: 'positive',
    sentimentScore: 0.7,
    impact: 'High',
  },
  {
    id: '10',
    headline: 'ECB holds rates steady, signals cuts coming in 2024',
    summary: 'The European Central Bank maintained interest rates unchanged for the third consecutive meeting, with officials signaling rate cuts could begin in June.',
    source: 'Reuters',
    sourceUrl: 'https://reuters.com/ecb-rates-march-2024',
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    tickers: ['EURUSD=X', 'EUO', 'VGK'],
    category: 'Macro',
    sentiment: 'positive',
    sentimentScore: 0.5,
    impact: 'High',
  },
];

// In production, fetch from RSS feeds:
// - Reuters: https://feeds.reuters.com/reuters/businessNews
// - CNBC: https://www.cnbc.com/id/100003114/device/rss/rss.html
// - Bloomberg: https://feeds.bloomberg.com/markets/news.rss
// - SEC Filings: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany

function analyzeSentiment(headline: string, summary: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } {
  const text = `${headline} ${summary}`.toLowerCase();

  // Positive sentiment indicators
  const positiveWords = [
    'surge', 'rise', 'gain', 'increase', 'growth', 'beat', 'exceed', 'outperform', 'bull',
    'upgrade', 'rally', 'strength', 'expansion', 'profit', 'success', 'breakthrough',
    'recovery', 'improvement', 'boost', 'positive', 'strong', 'higher',
  ];

  // Negative sentiment indicators
  const negativeWords = [
    'decline', 'fall', 'drop', 'decrease', 'loss', 'miss', 'underperform', 'bear',
    'downgrade', 'crash', 'weakness', 'contraction', 'concern', 'risk', 'warning',
    'investigation', 'recall', 'cut', 'negative', 'lower', 'disappoint', 'fail',
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach((word) => {
    if (text.includes(word)) positiveCount++;
  });

  negativeWords.forEach((word) => {
    if (text.includes(word)) negativeCount++;
  });

  const score = (positiveCount - negativeCount) / (positiveCount + negativeCount + 1);

  if (score > 0.2) return { sentiment: 'positive' as const, score };
  if (score < -0.2) return { sentiment: 'negative' as const, score };
  return { sentiment: 'neutral' as const, score };
}

export async function handleNewsFirehose(req: Request): Promise<Response> {
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

  try {
    const urlObj = new URL(req.url, 'http://localhost:3000');

    const limitParam = urlObj.searchParams.get('limit');
    const categoryParam = urlObj.searchParams.get('category');
    const tickerParam = urlObj.searchParams.get('ticker') || urlObj.searchParams.get('q');
    const sentimentParam = urlObj.searchParams.get('sentiment');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Filter news items based on parameters
    let filteredItems = [...MOCK_NEWS_ITEMS];

    if (categoryParam) {
      filteredItems = filteredItems.filter((item: NewsItem) =>
        item.category.toLowerCase().includes(categoryParam.toLowerCase())
      );
    }

    if (tickerParam) {
      const tickerUpper = tickerParam.toUpperCase();
      const matched = filteredItems.filter((item: NewsItem) =>
        item.tickers.some((t: string) => t.toUpperCase().includes(tickerUpper))
      );
      // If no ticker match, return general news (don't return empty)
      filteredItems = matched.length > 0 ? matched : filteredItems;
    }

    if (sentimentParam) {
      filteredItems = filteredItems.filter((item: NewsItem) =>
        item.sentiment.toLowerCase() === sentimentParam.toLowerCase()
      );
    }

    // Sort by published date (newest first) and apply limit
    filteredItems = filteredItems
      .sort((a: NewsItem, b: NewsItem) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit);

    // Calculate summary
    const positive = filteredItems.filter((item) => item.sentiment === 'positive').length;
    const negative = filteredItems.filter((item) => item.sentiment === 'negative').length;
    const neutral = filteredItems.filter((item) => item.sentiment === 'neutral').length;
    const highImpact = filteredItems.filter((item) => item.impact === 'High').length;

    // Count by category
    const categoryCounts = filteredItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categories = Object.entries(categoryCounts).map(([name, count]) => ({ name, count }));

    const response: NewsResponse = {
      items: filteredItems,
      summary: {
        total: filteredItems.length,
        positive,
        negative,
        neutral,
        highImpact,
        categories,
      },
      lastUpdated: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute - news updates frequently
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in news firehose endpoint:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch news',
        details: String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
