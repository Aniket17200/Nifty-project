/**
 * Bloomberg Terminal - PRTU/PORT (Portfolio Management) API Endpoint
 * Handles portfolio administration, P&L tracking, and risk analysis
 * Called from: /api/portfolio
 */

interface Position {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  sector: string;
  beta: number;
}

interface Portfolio {
  id: string;
  name: string;
  positions: Position[];
  summary: {
    totalMarketValue: number;
    totalCostBasis: number;
    totalUnrealizedPnL: number;
    totalUnrealizedPnLPercent: number;
    cash: number;
    todayPnL: number;
    todayPnLPercent: number;
    positionsCount: number;
  };
  riskMetrics: {
    portfolioBeta: number;
    valueAtRisk1d: number;
    valueAtRisk5d: number;
    valueAtRisk30d: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  allocation: {
    sectors: { name: string; value: number; percent: number }[];
    topHoldings: { symbol: string; value: number; percent: number }[];
  };
  lastUpdated: string;
}

interface Transaction {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
  commission?: number;
}

// Mock portfolio storage (in production, use database)
const MOCK_PORTFOLIOS: Portfolio[] = [
  {
    id: '1',
    name: 'My Growth Portfolio',
    positions: [
      {
        id: '1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        quantity: 150,
        averageCost: 145.50,
        currentPrice: 172.34,
        marketValue: 25851.00,
        costBasis: 21825.00,
        unrealizedPnL: 4026.00,
        unrealizedPnLPercent: 18.44,
        sector: 'Technology',
        beta: 1.25,
      },
      {
        id: '2',
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        quantity: 50,
        averageCost: 650.00,
        currentPrice: 875.32,
        marketValue: 43766.00,
        costBasis: 32500.00,
        unrealizedPnL: 11266.00,
        unrealizedPnLPercent: 34.66,
        sector: 'Technology',
        beta: 1.75,
      },
      {
        id: '3',
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        quantity: 100,
        averageCost: 380.00,
        currentPrice: 412.56,
        marketValue: 41256.00,
        costBasis: 38000.00,
        unrealizedPnL: 3256.00,
        unrealizedPnLPercent: 8.57,
        sector: 'Technology',
        beta: 0.95,
      },
      {
        id: '4',
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        quantity: 75,
        averageCost: 135.00,
        currentPrice: 148.90,
        marketValue: 11167.50,
        costBasis: 10125.00,
        unrealizedPnL: 1042.50,
        unrealizedPnLPercent: 10.29,
        sector: 'Technology',
        beta: 1.10,
      },
      {
        id: '5',
        symbol: 'JPM',
        name: 'JPMorgan Chase & Co.',
        quantity: 200,
        averageCost: 155.00,
        currentPrice: 178.45,
        marketValue: 35690.00,
        costBasis: 31000.00,
        unrealizedPnL: 4690.00,
        unrealizedPnLPercent: 15.13,
        sector: 'Financial Services',
        beta: 1.20,
      },
    ],
    summary: {
      totalMarketValue: 157730.50,
      totalCostBasis: 133450.00,
      totalUnrealizedPnL: 24280.50,
      totalUnrealizedPnLPercent: 18.20,
      cash: 5000.00,
      todayPnL: 1250.50,
      todayPnLPercent: 0.79,
      positionsCount: 5,
    },
    riskMetrics: {
      portfolioBeta: 1.35,
      valueAtRisk1d: 3154.61,
      valueAtRisk5d: 7886.52,
      valueAtRisk30d: 23659.56,
      sharpeRatio: 1.45,
      maxDrawdown: -8.5,
    },
    allocation: {
      sectors: [
        { name: 'Technology', value: 122040.50, percent: 77.38 },
        { name: 'Financial Services', value: 35690.00, percent: 22.62 },
      ],
      topHoldings: [
        { symbol: 'NVDA', value: 43766.00, percent: 27.75 },
        { symbol: 'MSFT', value: 41256.00, percent: 26.16 },
        { symbol: 'JPM', value: 35690.00, percent: 22.62 },
        { symbol: 'GOOGL', value: 11167.50, percent: 7.08 },
        { symbol: 'AAPL', value: 25851.00, percent: 16.39 },
      ],
    },
    lastUpdated: new Date().toISOString(),
  },
];

// Mock transactions
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    symbol: 'AAPL',
    type: 'BUY',
    quantity: 150,
    price: 145.50,
    total: 21825.00,
    timestamp: new Date(Date.now() - 90 * 86400000).toISOString(),
    commission: 9.99,
  },
  {
    id: '2',
    symbol: 'NVDA',
    type: 'BUY',
    quantity: 50,
    price: 650.00,
    total: 32500.00,
    timestamp: new Date(Date.now() - 60 * 86400000).toISOString(),
    commission: 9.99,
  },
  {
    id: '3',
    symbol: 'MSFT',
    type: 'BUY',
    quantity: 100,
    price: 380.00,
    total: 38000.00,
    timestamp: new Date(Date.now() - 45 * 86400000).toISOString(),
    commission: 9.99,
  },
];

// Calculate VaR (Value at Risk) using historical simulation
function calculateVaR(portfolioValue: number, volatility: number, confidence: number, timeHorizonDays: number): number {
  // Simplified VaR calculation
  // VaR = portfolioValue * volatility * sqrt(timeHorizon) * z-score
  const zScores = { 0.95: 1.645, 0.99: 2.326 };
  const zScore = zScores[confidence as keyof typeof zScores] || 1.645;

  return portfolioValue * (volatility / 100) * Math.sqrt(timeHorizonDays) * zScore;
}

// Calculate Sharpe Ratio
function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length);

  return stdDev === 0 ? 0 : (avgReturn - riskFreeRate) / stdDev;
}

// Calculate maximum drawdown
function calculateMaxDrawdown(prices: number[]): number {
  let maxDrawdown = 0;
  let peak = prices[0];

  for (const price of prices) {
    if (price > peak) {
      peak = price;
    } else {
      const drawdown = (peak - price) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }

  return maxDrawdown * -100; // Return as negative percentage
}

export async function handlePortfolioManagement(req: Request): Promise<Response> {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(req.url, 'http://localhost:3000');

  // GET - Fetch portfolio
  if (req.method === 'GET') {
    const portfolioId = url.searchParams.get('id');
    const includeRisk = url.searchParams.get('risk') === 'true';

    try {
      let portfolio = portfolioId
        ? MOCK_PORTFOLIOS.find((p) => p.id === portfolioId)
        : MOCK_PORTFOLIOS[0];

      if (!portfolio) {
        return new Response(JSON.stringify({ error: 'Portfolio not found' }), { status: 404 });
      }

      // Update current prices and calculate P&L
      portfolio.positions = portfolio.positions.map((pos) => {
        // In production, fetch real-time price from Yahoo Finance
        const priceChange = (pos.currentPrice / pos.averageCost - 1) * 10; // Simulate 10% price movement
        const currentPrice = pos.currentPrice * (1 + priceChange / 100);

        const marketValue = currentPrice * pos.quantity;
        const unrealizedPnL = marketValue - pos.costBasis;
        const unrealizedPnLPercent = (unrealizedPnL / pos.costBasis) * 100;

        return {
          ...pos,
          currentPrice,
          marketValue,
          unrealizedPnL,
          unrealizedPnLPercent,
        };
      });

      // Recalculate summary
      const totalMarketValue = portfolio.positions.reduce((sum, pos) => sum + pos.marketValue, 0);
      const totalCostBasis = portfolio.positions.reduce((sum, pos) => sum + pos.costBasis, 0);
      const totalUnrealizedPnL = totalMarketValue - totalCostBasis;
      const totalUnrealizedPnLPercent = (totalUnrealizedPnL / totalCostBasis) * 100;

      // Simulate today's P&L
      const todayPnL = totalMarketValue * 0.005; // 0.5% daily gain
      const todayPnLPercent = 0.5;

      portfolio.summary = {
        ...portfolio.summary,
        totalMarketValue,
        totalCostBasis,
        totalUnrealizedPnL,
        totalUnrealizedPnLPercent,
        todayPnL,
        todayPnLPercent,
        positionsCount: portfolio.positions.length,
      };

      // Recalculate allocation
      const sectorAllocation = portfolio.positions.reduce((acc, pos) => {
        acc[pos.sector] = (acc[pos.sector] || 0) + pos.marketValue;
        return acc;
      }, {} as Record<string, number>);

      portfolio.allocation.sectors = Object.entries(sectorAllocation).map(([name, value]) => ({
        name,
        value,
        percent: (value / totalMarketValue) * 100,
      }));

      portfolio.allocation.topHoldings = portfolio.positions
        .sort((a, b) => b.marketValue - a.marketValue)
        .slice(0, 5)
        .map((pos) => ({
          symbol: pos.symbol,
          value: pos.marketValue,
          percent: (pos.marketValue / totalMarketValue) * 100,
        }));

      // Calculate risk metrics if requested
      if (includeRisk) {
        // Calculate portfolio beta (weighted average)
        const portfolioBeta = portfolio.positions.reduce((sum, pos) => {
          return sum + (pos.beta * pos.marketValue);
        }, 0) / totalMarketValue;

        // Estimate portfolio volatility (simplified)
        const portfolioVolatility = Math.sqrt(
          portfolio.positions.reduce((sum, pos) => {
            const weight = pos.marketValue / totalMarketValue;
            return sum + Math.pow(weight * pos.beta * 15, 2); // Assume 15% market vol
          }, 0)
        ) * 100;

        portfolio.riskMetrics = {
          portfolioBeta,
          valueAtRisk1d: calculateVaR(totalMarketValue, portfolioVolatility, 0.95, 1),
          valueAtRisk5d: calculateVaR(totalMarketValue, portfolioVolatility, 0.95, 5),
          valueAtRisk30d: calculateVaR(totalMarketValue, portfolioVolatility, 0.95, 30),
          sharpeRatio: 1.45, // Mock value
          maxDrawdown: -8.5, // Mock value
        };
      }

      portfolio.lastUpdated = new Date().toISOString();

      return new Response(JSON.stringify(portfolio), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch portfolio', details: String(error) }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // POST - Create or update position
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { symbol, quantity, price, type } = body;

      if (!symbol || !quantity || !price) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
      }

      // In production, update database
      const transaction: Transaction = {
        id: Date.now().toString(),
        symbol: symbol.toUpperCase(),
        type: type || 'BUY',
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        total: parseFloat(quantity) * parseFloat(price),
        timestamp: new Date().toISOString(),
        commission: body.commission || 9.99,
      };

      return new Response(JSON.stringify({ success: true, transaction }), {
        status: 201,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to create position', details: String(error) }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // DELETE - Remove position
  if (req.method === 'DELETE') {
    try {
      const body = await req.json();
      const { positionId } = body;

      if (!positionId) {
        return new Response(JSON.stringify({ error: 'Missing position ID' }), { status: 400 });
      }

      // In production, delete from database
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to delete position', details: String(error) }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}
