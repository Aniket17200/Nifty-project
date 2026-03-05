/**
 * Bloomberg Terminal - FA (Financial Analysis) API Endpoint
 * Fetches comprehensive financial statements (Income Statement, Balance Sheet, Cash Flow)
 * Called from: /api/fa-financials
 * Source: Yahoo Finance API (financial statements data)
 */

interface FinancialMetric {
  value: number;
  year: number;
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  currency?: string;
}

interface IncomeStatement {
  year: number;
  revenue: FinancialMetric;
  grossProfit: FinancialMetric;
  operatingIncome: FinancialMetric;
  netIncome: FinancialMetric;
  epsBasic: FinancialMetric;
  epsDiluted: FinancialMetric;
  ebitda: FinancialMetric;
  interestExpense: FinancialMetric;
  taxExpense: FinancialMetric;
  researchDevelopment: FinancialMetric;
  sellingGeneralAdministrative: FinancialMetric;
}

interface BalanceSheet {
  year: number;
  totalAssets: FinancialMetric;
  totalLiabilities: FinancialMetric;
  totalEquity: FinancialMetric;
  currentAssets: FinancialMetric;
  currentLiabilities: FinancialMetric;
  cashAndEquivalents: FinancialMetric;
  totalDebt: FinancialMetric;
  inventory: FinancialMetric;
  propertyPlantEquipment: FinancialMetric;
  retainedEarnings: FinancialMetric;
  commonStockSharesOutstanding: FinancialMetric;
}

interface CashFlowStatement {
  year: number;
  operatingCashFlow: FinancialMetric;
  investingCashFlow: FinancialMetric;
  financingCashFlow: FinancialMetric;
  freeCashFlow: FinancialMetric;
  capitalExpenditure: FinancialMetric;
  dividendsPaid: FinancialMetric;
  stockRepurchases: FinancialMetric;
  changeInCash: FinancialMetric;
  cashAtBeginningOfPeriod: FinancialMetric;
  cashAtEndOfPeriod: FinancialMetric;
}

interface FinancialAnalysisResponse {
  symbol: string;
  name: string;
  currency: string;
  fiscalYearEnd: string;
  incomeStatements: IncomeStatement[];
  balanceSheets: BalanceSheet[];
  cashFlowStatements: CashFlowStatement[];
  ratios: {
    grossMargin: { year: number; value: number }[];
    operatingMargin: { year: number; value: number }[];
    netMargin: { year: number; value: number }[];
    roe: { year: number; value: number }[];
    roa: { year: number; value: number }[];
    debtToEquity: { year: number; value: number }[];
    currentRatio: { year: number; value: number }[];
  };
  trends: {
    revenueGrowth: { year: number; value: number }[];
    netIncomeGrowth: { year: number; value: number }[];
    epsGrowth: { year: number; value: number }[];
  };
  lastUpdated: string;
}

// Mock financial data generator (in production, fetch from SEC EDGAR or Yahoo Finance)
function generateMockFinancialData(symbol: string): FinancialAnalysisResponse {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  // Generate base revenue with growth
  let baseRevenue = 50000000000; // $50B starting
  const incomeStatements: IncomeStatement[] = years.map((year, i) => {
    const growth = 1 + (Math.random() * 0.2 - 0.05); // 15% avg growth
    const revenue = i === 0 ? baseRevenue * growth : baseRevenue;
    baseRevenue = revenue;

    const grossProfit = revenue * (0.35 + Math.random() * 0.1); // 35-45% gross margin
    const operatingIncome = grossProfit * (0.25 + Math.random() * 0.1);
    const netIncome = operatingIncome * (0.70 + Math.random() * 0.15);
    const sharesOutstanding = 1000000000 + Math.random() * 500000000;

    return {
      year,
      revenue: { value: revenue, year, currency: 'USD' },
      grossProfit: { value: grossProfit, year, currency: 'USD' },
      operatingIncome: { value: operatingIncome, year, currency: 'USD' },
      netIncome: { value: netIncome, year, currency: 'USD' },
      epsBasic: { value: netIncome / sharesOutstanding, year, currency: 'USD' },
      epsDiluted: { value: (netIncome / sharesOutstanding) * 0.95, year, currency: 'USD' },
      ebitda: { value: operatingIncome * 1.2, year, currency: 'USD' },
      interestExpense: { value: revenue * 0.01, year, currency: 'USD' },
      taxExpense: { value: operatingIncome * 0.21, year, currency: 'USD' },
      researchDevelopment: { value: revenue * 0.15, year, currency: 'USD' },
      sellingGeneralAdministrative: { value: revenue * 0.10, year, currency: 'USD' },
    };
  });

  // Generate balance sheets
  let totalAssets = 300000000000;
  const balanceSheets: BalanceSheet[] = years.map((year) => {
    const equity = totalAssets * (0.40 + Math.random() * 0.10);
    const liabilities = totalAssets - equity;

    return {
      year,
      totalAssets: { value: totalAssets, year, currency: 'USD' },
      totalLiabilities: { value: liabilities, year, currency: 'USD' },
      totalEquity: { value: equity, year, currency: 'USD' },
      currentAssets: { value: totalAssets * 0.45, year, currency: 'USD' },
      currentLiabilities: { value: totalAssets * 0.25, year, currency: 'USD' },
      cashAndEquivalents: { value: totalAssets * 0.15, year, currency: 'USD' },
      totalDebt: { value: liabilities * 0.40, year, currency: 'USD' },
      inventory: { value: totalAssets * 0.08, year, currency: 'USD' },
      propertyPlantEquipment: { value: totalAssets * 0.35, year, currency: 'USD' },
      retainedEarnings: { value: equity * 0.60, year, currency: 'USD' },
      commonStockSharesOutstanding: { value: 1000000000 + Math.random() * 500000000, year, currency: 'USD' },
    };
  });

  // Generate cash flow statements
  const cashFlowStatements: CashFlowStatement[] = years.map((year) => {
    const operatingCF = incomeStatements.find((is) => is.year === year)?.netIncome.value || 0;
    const capex = operatingCF * 0.4;

    return {
      year,
      operatingCashFlow: { value: operatingCF, year, currency: 'USD' },
      investingCashFlow: { value: -capex, year, currency: 'USD' },
      financingCashFlow: { value: -operatingCF * 0.1, year, currency: 'USD' },
      freeCashFlow: { value: operatingCF - capex, year, currency: 'USD' },
      capitalExpenditure: { value: capex, year, currency: 'USD' },
      dividendsPaid: { value: operatingCF * 0.05, year, currency: 'USD' },
      stockRepurchases: { value: operatingCF * 0.03, year, currency: 'USD' },
      changeInCash: { value: operatingCF - capex - operatingCF * 0.1, year, currency: 'USD' },
      cashAtBeginningOfPeriod: { value: 5000000000 + Math.random() * 2000000000, year, currency: 'USD' },
      cashAtEndOfPeriod: { value: 5000000000 + Math.random() * 2000000000, year, currency: 'USD' },
    };
  });

  // Calculate ratios
  const ratios = {
    grossMargin: years.map((year) => {
      const is = incomeStatements.find((s) => s.year === year);
      return { year, value: is ? (is.grossProfit.value / is.revenue.value) * 100 : 0 };
    }),
    operatingMargin: years.map((year) => {
      const is = incomeStatements.find((s) => s.year === year);
      return { year, value: is ? (is.operatingIncome.value / is.revenue.value) * 100 : 0 };
    }),
    netMargin: years.map((year) => {
      const is = incomeStatements.find((s) => s.year === year);
      return { year, value: is ? (is.netIncome.value / is.revenue.value) * 100 : 0 };
    }),
    roe: years.map((year) => {
      const is = incomeStatements.find((s) => s.year === year);
      const bs = balanceSheets.find((s) => s.year === year);
      return { year, value: (is && bs) ? (is.netIncome.value / bs.totalEquity.value) * 100 : 0 };
    }),
    roa: years.map((year) => {
      const is = incomeStatements.find((s) => s.year === year);
      const bs = balanceSheets.find((s) => s.year === year);
      return { year, value: (is && bs) ? (is.netIncome.value / bs.totalAssets.value) * 100 : 0 };
    }),
    debtToEquity: years.map((year) => {
      const bs = balanceSheets.find((s) => s.year === year);
      return { year, value: bs ? (bs.totalDebt.value / bs.totalEquity.value) * 100 : 0 };
    }),
    currentRatio: years.map((year) => {
      const bs = balanceSheets.find((s) => s.year === year);
      return { year, value: bs ? (bs.currentAssets.value / bs.currentLiabilities.value) : 0 };
    }),
  };

  // Calculate trends
  const trends = {
    revenueGrowth: years.slice(1).map((year, i) => {
      const current = incomeStatements.find((s) => s.year === year);
      const previous = incomeStatements.find((s) => s.year === years[i]);
      return {
        year,
        value:
          current && previous
            ? ((current.revenue.value - previous.revenue.value) / previous.revenue.value) * 100
            : 0,
      };
    }),
    netIncomeGrowth: years.slice(1).map((year, i) => {
      const current = incomeStatements.find((s) => s.year === year);
      const previous = incomeStatements.find((s) => s.year === years[i]);
      return {
        year,
        value:
          current && previous
            ? ((current.netIncome.value - previous.netIncome.value) / previous.netIncome.value) * 100
            : 0,
      };
    }),
    epsGrowth: years.slice(1).map((year, i) => {
      const current = incomeStatements.find((s) => s.year === year);
      const previous = incomeStatements.find((s) => s.year === years[i]);
      return {
        year,
        value:
          current && previous
            ? ((current.epsBasic.value - previous.epsBasic.value) / previous.epsBasic.value) * 100
            : 0,
      };
    }),
  };

  return {
    symbol,
    name: `${symbol} Company`,
    currency: 'USD',
    fiscalYearEnd: 'December 31',
    incomeStatements,
    balanceSheets,
    cashFlowStatements,
    ratios,
    trends,
    lastUpdated: new Date().toISOString(),
  };
}

export async function handleFAFinancials(req: Request): Promise<Response> {
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
  const yearsParam = url.searchParams.get('years');
  const years = yearsParam ? parseInt(yearsParam, 10) : 10;

  if (!symbol) {
    return new Response(JSON.stringify({ error: 'Missing symbol parameter' }), { status: 400 });
  }

  try {
    // In production, fetch real data from:
    // 1. SEC EDGAR API (XBRL data) - https://www.sec.gov/edgar/sec-api-documentation
    // 2. Yahoo Finance API - financial statements endpoint
    // 3. Financial Modeling Prep (FMP) - https://financialmodelingprep.com/developer/docs

    // For now, generate mock data
    const financialData = generateMockFinancialData(symbol);

    // Limit to requested years
    financialData.incomeStatements = financialData.incomeStatements.slice(0, years);
    financialData.balanceSheets = financialData.balanceSheets.slice(0, years);
    financialData.cashFlowStatements = financialData.cashFlowStatements.slice(0, years);

    return new Response(JSON.stringify(financialData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in FA financials endpoint:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch financial data',
        details: String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
