// Popular symbols for quick-access grid
export interface AnalyzeTarget {
    type: 'stock' | 'index' | 'crypto' | 'etf';
    symbol: string;
    name: string;
    price?: number;
    change?: number;
    changePercent?: number;
    volume?: number;
    region?: string;
}

export type Signal = 'BUY' | 'SELL' | 'NEUTRAL' | 'OVERBOUGHT' | 'OVERSOLD';

export const CRYPTO_SYMBOLS: Record<string, string> = {
    'BTC-USD': 'Bitcoin', 'ETH-USD': 'Ethereum', 'BNB-USD': 'BNB',
    'SOL-USD': 'Solana', 'XRP-USD': 'Ripple', 'DOGE-USD': 'Dogecoin',
    'ADA-USD': 'Cardano', 'AVAX-USD': 'Avalanche', 'MATIC-USD': 'Polygon',
    'DOT-USD': 'Polkadot', 'LINK-USD': 'Chainlink', 'UNI7083-USD': 'Uniswap',
};

export const POPULAR_STOCKS = [
    { s: 'AAPL', n: 'Apple' }, { s: 'MSFT', n: 'Microsoft' },
    { s: 'NVDA', n: 'NVIDIA' }, { s: 'TSLA', n: 'Tesla' },
    { s: 'AMZN', n: 'Amazon' }, { s: 'GOOGL', n: 'Alphabet' },
    { s: 'META', n: 'Meta' }, { s: 'JPM', n: 'JPMorgan' },
    { s: 'GS', n: 'Goldman' }, { s: 'BRK-B', n: 'Berkshire' },
    { s: 'V', n: 'Visa' }, { s: 'JNJ', n: 'Johnson & Johnson' },
];

export const POPULAR_CRYPTO = [
    { s: 'BTC-USD', n: 'Bitcoin' }, { s: 'ETH-USD', n: 'Ethereum' },
    { s: 'SOL-USD', n: 'Solana' }, { s: 'BNB-USD', n: 'BNB' },
    { s: 'XRP-USD', n: 'Ripple' }, { s: 'DOGE-USD', n: 'Dogecoin' },
];

export const POPULAR_INDICES = [
    { s: '^GSPC', n: 'S&P 500' }, { s: '^DJI', n: 'Dow Jones' },
    { s: '^IXIC', n: 'NASDAQ' }, { s: '^FTSE', n: 'FTSE 100' },
    { s: '^N225', n: 'Nikkei 225' }, { s: '^HSI', n: 'Hang Seng' },
];

// Maps interval → sensible Yahoo Finance range
export const INTERVAL_RANGE: Record<string, string> = {
    '1m': '1d', '5m': '5d', '15m': '5d', '30m': '1mo',
    '1h': '1mo', '1d': '6mo', '1wk': '2y',
};
