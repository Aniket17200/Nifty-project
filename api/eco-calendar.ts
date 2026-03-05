/**
 * Bloomberg Terminal - ECO (Economic Calendar) API Endpoint
 * Fetches upcoming economic events, earnings, and market-moving data
 * Called from: /api/eco-calendar
 * Source: TradingView Economic Calendar API (public)
 */

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  name: string;
  country: string;
  currency: string;
  impact: 'High' | 'Medium' | 'Low';
  actual?: number | string;
  forecast?: number;
  previous?: number;
  category: 'CPI' | 'GDP' | 'Employment' | 'centralBank' | 'PMI' | 'retailSales' | 'Trade' | 'Other';
}

interface EarningsEvent {
  id: string;
  symbol: string;
  name: string;
  date: string;
  time: string;
  expectedEPS?: number;
  previousEPS?: number;
  marketCap?: number;
}

interface CalendarResponse {
  upcomingEvents: EconomicEvent[];
  earnings: EarningsEvent[];
  summary: {
    highImpactThisWeek: number;
    upcomingCBMeetings: number;
    nextFedMeeting?: string;
  };
  lastUpdated: string;
}

// Economic calendar categories
const EVENT_CATEGORIES = {
  CPI: ['Consumer Price Index', 'Core CPI', 'PCE Price Index', 'CPI MoM', 'CPI YoY'],
  GDP: ['GDP', 'GDP MoM', 'GDP YoY', 'GDP Annualized'],
  Employment: ['Non-Farm Payrolls', 'Unemployment Rate', 'ADP Employment Change', 'Jobless Claims'],
  centralBank: ['Fed Rate Decision', 'ECB Rate Decision', 'BoE Rate Decision', 'BoJ Rate Decision', 'FOMC Minutes'],
  PMI: ['Manufacturing PMI', 'Services PMI', 'Composite PMI', 'ISM Manufacturing', 'ISM Services'],
  retailSales: ['Retail Sales', 'Core Retail Sales', 'Retail Sales MoM', 'Retail Sales YoY'],
  Trade: ['Trade Balance', 'Current Account', 'Export', 'Import'],
};

function determineCategory(eventName: string): 'CPI' | 'GDP' | 'Employment' | 'centralBank' | 'PMI' | 'retailSales' | 'Trade' | 'Other' {
  const name = eventName.toLowerCase();

  for (const [category, keywords] of Object.entries(EVENT_CATEGORIES)) {
    for (const keyword of keywords) {
      if (name.includes(keyword.toLowerCase())) {
        return category as any;
      }
    }
  }

  return 'Other';
}

function getCountryCode(countryName: string): string {
  const countryCodes: Record<string, string> = {
    'United States': 'US',
    'USA': 'US',
    'UK': 'UK',
    'Eurozone': 'EU',
    'Euro Area': 'EU',
    'Germany': 'DE',
    'France': 'FR',
    'China': 'CN',
    'Japan': 'JP',
    'United Kingdom': 'GB',
    'Canada': 'CA',
    'Australia': 'AU',
    'New Zealand': 'NZ',
    'Switzerland': 'CH',
    'Sweden': 'SE',
    'Norway': 'NO',
  };

  return countryCodes[countryName] || countryName.slice(0, 2).toUpperCase();
}

// Mock economic events (in production, fetch from TradingView or ForexFactory)
const MOCK_ECONOMIC_EVENTS: EconomicEvent[] = [
  {
    id: '1',
    date: '2026-03-05',
    time: '08:30',
    name: 'Non-Farm Payrolls',
    country: 'United States',
    currency: 'USD',
    impact: 'High',
    category: 'Employment',
    actual: undefined,
    forecast: 200000,
    previous: 175000,
  },
  {
    id: '2',
    date: '2026-03-05',
    time: '10:00',
    name: 'ISM Manufacturing PMI',
    country: 'United States',
    currency: 'USD',
    impact: 'High',
    category: 'PMI',
    actual: undefined,
    forecast: 50.5,
    previous: 49.2,
  },
  {
    id: '3',
    date: '2026-03-06',
    time: '03:00',
    name: 'GDP Annualized',
    country: 'United States',
    currency: 'USD',
    impact: 'High',
    category: 'GDP',
    actual: undefined,
    forecast: 2.1,
    previous: 2.5,
  },
  {
    id: '4',
    date: '2026-03-07',
    time: '07:00',
    name: 'Consumer Price Index YoY',
    country: 'United States',
    currency: 'USD',
    impact: 'High',
    category: 'CPI',
    actual: undefined,
    forecast: 2.9,
    previous: 3.1,
  },
  {
    id: '5',
    date: '2026-03-08',
    time: '08:00',
    name: 'Fed Interest Rate Decision',
    country: 'United States',
    currency: 'USD',
    impact: 'High',
    category: 'centralBank',
    actual: undefined,
    forecast: 5.00,
    previous: 5.25,
  },
  {
    id: '6',
    date: '2026-03-08',
    time: '08:30',
    name: 'Unemployment Rate',
    country: 'United States',
    currency: 'USD',
    impact: 'Medium',
    category: 'Employment',
    actual: undefined,
    forecast: 3.8,
    previous: 3.9,
  },
  {
    id: '7',
    date: '2026-03-12',
    time: '07:45',
    name: 'ECB Interest Rate Decision',
    country: 'Eurozone',
    currency: 'EUR',
    impact: 'High',
    category: 'centralBank',
    actual: undefined,
    forecast: 3.75,
    previous: 4.00,
  },
  {
    id: '8',
    date: '2026-03-13',
    time: '07:00',
    name: 'Consumer Price Index YoY',
    country: 'United Kingdom',
    currency: 'GBP',
    impact: 'High',
    category: 'CPI',
    actual: undefined,
    forecast: 3.2,
    previous: 3.4,
  },
  {
    id: '9',
    date: '2026-03-14',
    time: '07:50',
    name: 'GDP MoM',
    country: 'Japan',
    currency: 'JPY',
    impact: 'High',
    category: 'GDP',
    actual: undefined,
    forecast: 0.2,
    previous: 0.1,
  },
  {
    id: '10',
    date: '2026-03-15',
    time: '02:30',
    name: 'Retail Sales MoM',
    country: 'China',
    currency: 'CNY',
    impact: 'High',
    category: 'retailSales',
    actual: undefined,
    forecast: 0.5,
    previous: 0.3,
  },
];

// Mock earnings events
const MOCK_EARNINGS: EarningsEvent[] = [
  {
    id: '1',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    date: '2026-03-15',
    time: 'After Market',
    expectedEPS: 4.52,
    previousEPS: 3.71,
  },
  {
    id: '2',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    date: '2026-03-18',
    time: 'After Market',
    expectedEPS: 1.52,
    previousEPS: 1.46,
  },
  {
    id: '3',
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    date: '2026-03-19',
    time: 'After Market',
    expectedEPS: 0.73,
    previousEPS: 0.91,
  },
  {
    id: '4',
    symbol: 'META',
    name: 'Meta Platforms, Inc.',
    date: '2026-03-20',
    time: 'After Market',
    expectedEPS: 4.21,
    previousEPS: 3.71,
  },
  {
    id: '5',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    date: '2026-03-21',
    time: 'After Market',
    expectedEPS: 2.65,
    previousEPS: 2.48,
  },
];

export async function handleECOCalendar(req: Request): Promise<Response> {
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
  const daysParam = url.searchParams.get('days');
  const categoryParam = url.searchParams.get('category');
  const countryParam = url.searchParams.get('country');

  const days = daysParam ? parseInt(daysParam, 10) : 30;

  try {
    let filteredEvents = [...MOCK_ECONOMIC_EVENTS];

    // Filter by date range
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    filteredEvents = filteredEvents.filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate >= now && eventDate <= futureDate;
    });

    // Filter by category if specified
    if (categoryParam) {
      filteredEvents = filteredEvents.filter((event) =>
        event.category === categoryParam
      );
    }

    // Filter by country if specified
    if (countryParam) {
      filteredEvents = filteredEvents.filter((event) =>
        event.country.toLowerCase().includes(countryParam.toLowerCase())
      );
    }

    // Calculate summary
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const highImpactThisWeek = filteredEvents.filter(
      (event) =>
        event.impact === 'High' && new Date(event.date) <= weekFromNow
    ).length;

    const upcomingCBMeetings = filteredEvents.filter(
      (event) => event.category === 'centralBank'
    ).length;

    const nextFedMeeting = filteredEvents
      .filter(
        (event) =>
          event.category === 'centralBank' && event.country === 'United States'
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
      ?.date;

    const response: CalendarResponse = {
      upcomingEvents: filteredEvents,
      earnings: MOCK_EARNINGS,
      summary: {
        highImpactThisWeek,
        upcomingCBMeetings,
        nextFedMeeting,
      },
      lastUpdated: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in ECO calendar endpoint:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch economic calendar',
        details: String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
