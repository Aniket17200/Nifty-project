import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import {
  Terminal,
  Globe,
  TrendingUp,
  TrendingDown,
  Newspaper,
  Settings,
  Command,
  Bell,
  Maximize2,
  Minimize2,
  ChevronRight,
  Activity,
  LineChart,

  Zap,
} from 'lucide-react';
import AnalyzeModal, { AnalyzeTarget } from '../components/AnalyzeModal';

// ─── Types ────────────────────────────────────────────────────────────────
interface Ticker {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

interface GlobalIndex {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  region: 'Americas' | 'Europe' | 'Asia-Pacific' | 'Africa';
  status: 'Open' | 'Closed';
}

interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  tickers?: string[];
}

interface Panel {
  id: string;
  title: string;
  type: 'chart' | 'news' | 'indices' | 'movers' | 'watchlist' | 'command'
  | 'des' | 'fa' | 'eco' | 'fx' | 'crypto' | 'yieldcurve' | 'screener';
  size: 'small' | 'medium' | 'large' | 'full';
  minimized: boolean;
  tickerArg?: string;
}

// ─── Bloomberg Mnemonic Commands ───────────────────────────────────────────
const BLOOMBERG_COMMANDS = {
  // Market Overview
  WEI: { name: 'World Equity Indices', desc: 'Global market overview' },
  MOST: { name: 'Most Active', desc: 'Volume leaders, gainers, losers' },
  GMM: { name: 'Global Market Movers', desc: 'Market heat map' },
  MON: { name: 'Market Monitor', desc: 'Multi-panel layout' },

  // Equity Analysis
  DES: { name: 'Description', desc: 'Company profile & profile data' },
  FA: { name: 'Financial Analysis', desc: 'AI-powered financial deep dive' },
  ANR: { name: 'Analyst Ratings', desc: 'Analyst consensus' },
  GP: { name: 'Graph Prices', desc: 'Price charts with indicators' },

  // Fixed Income & Macro
  GC: { name: 'Yield Curve', desc: 'US Treasury yield curve' },
  ECO: { name: 'Economic Calendar', desc: 'Upcoming macro events' },
  WFX: { name: 'FX Monitor', desc: 'Live FX rates & central banks' },

  // Crypto
  CRYP: { name: 'Crypto Dashboard', desc: 'Top coins by market cap' },

  // Screener
  EQS: { name: 'Equity Screener', desc: 'Gainers, losers & volume leaders' },

  // News
  N: { name: 'News Firehose', desc: 'Real-time news' },
  NSE: { name: 'News Search', desc: 'Search news' },

  // Portfolio
  PRTU: { name: 'Portfolio Admin', desc: 'Manage portfolio' },
} as const;

type BloombergCommand = keyof typeof BLOOMBERG_COMMANDS;

// ─── Components ─────────────────────────────────────────────────────────────

function CommandInput({
  value,
  onChange,
  onSubmit,
  suggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  suggestions: Array<{ cmd: string; name: string; desc: string }>;
  onSelectSuggestion?: (s: string) => void; // kept for compat, unused internally
}) {
  const [open, setOpen] = useState(false);
  const [selIdx, setSelIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only show suggestions for the command part (first word), showing all
  // Bloomberg mnemonics that start with what the user typed
  const firstWord = value.trim().split(/\s+/)[0].toUpperCase();
  const filtered = firstWord
    ? suggestions.filter((s) => s.cmd.startsWith(firstWord) && s.cmd !== firstWord)
    : [];

  // Reset selection when filter changes
  useEffect(() => { setSelIdx(0); }, [filtered.length]);

  const closeAndSubmit = (cmd: string) => {
    setOpen(false);
    onChange(cmd);
    onSubmit(cmd);
    // Re‑focus so user can type next command
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && filtered.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx((i) => (i + 1) % filtered.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelIdx((i) => (i - 1 + filtered.length) % filtered.length); return; }
      if (e.key === 'Tab') { e.preventDefault(); closeAndSubmit(filtered[selIdx].cmd); return; }
      if (e.key === 'Enter') { e.preventDefault(); closeAndSubmit(filtered[selIdx].cmd); return; }
      if (e.key === 'Escape') { setOpen(false); return; }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      setOpen(false);
      onSubmit(value);
    }
  };

  const handleChange = (v: string) => {
    onChange(v);
    setOpen(v.length > 0);
    setSelIdx(0);
  };

  const handleGo = () => {
    setOpen(false);
    onSubmit(value);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/40 rounded-lg overflow-hidden focus-within:border-orange-500/70 transition-colors">
        <Terminal className="text-orange-400 ml-3 shrink-0" size={16} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (value.length > 0) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder="Command or ticker: AAPL · WEI · GP AAPL · DES TSLA · BTC-USD [Tab]"
          className="flex-1 bg-transparent px-3 py-2.5 text-orange-100 placeholder-orange-300/40 focus:outline-none font-mono text-sm"
        />
        {value && (
          <button
            onMouseDown={(e) => { e.preventDefault(); onChange(''); setOpen(false); inputRef.current?.focus(); }}
            className="px-2 text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none">
            ×
          </button>
        )}
        <button
          onMouseDown={(e) => { e.preventDefault(); handleGo(); }}
          className="bg-orange-600 hover:bg-orange-500 active:bg-orange-700 px-5 py-2.5 text-white font-bold text-sm transition-colors font-mono tracking-wide">
          GO
        </button>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900/98 border border-orange-500/30 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-sm">
          <div className="px-3 pt-2 pb-1 text-[10px] text-slate-600 uppercase tracking-widest border-b border-slate-800 flex justify-between">
            <span>Bloomberg Commands</span>
            <span>↑↓ navigate · Tab/Enter to select · Esc to close</span>
          </div>
          {filtered.slice(0, 8).map((s, i) => (
            <button
              key={s.cmd}
              onMouseDown={(e) => { e.preventDefault(); closeAndSubmit(s.cmd); }}
              onMouseEnter={() => setSelIdx(i)}
              className={`w-full px-4 py-2.5 text-left transition-colors border-b border-slate-800/50 last:border-0 ${i === selIdx ? 'bg-orange-600/25 text-orange-100' : 'text-slate-300 hover:bg-slate-800/60'
                }`}>
              <div className="flex items-center gap-3">
                <span className="w-16 font-mono font-black text-sm text-orange-400">{s.cmd}</span>
                <span className="text-slate-300 text-sm">{s.name}</span>
                <span className="text-slate-600 text-xs ml-auto">{s.desc}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Backdrop to close on outside click */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}

function MnemonicButtons({ onSelectCommand }: { onSelectCommand: (cmd: string) => void }) {
  const categories = {
    'Market Overview': ['WEI', 'MOST', 'MON'],
    'Equity Analysis': ['DES', 'FA', 'GP'],
    'Macro & Bonds': ['ECO', 'GC', 'WFX'],
    'Crypto': ['CRYP'],
    'Screener': ['EQS'],
    'News': ['N', 'NSE'],
    'Portfolio': ['PRTU'],
  };

  return (
    <div className="space-y-3">
      {Object.entries(categories).map(([category, commands]) => (
        <div key={category}>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{category}</div>
          <div className="flex flex-wrap gap-2">
            {commands.map((cmd) => (
              <button
                key={cmd}
                onClick={() => onSelectCommand(cmd)}
                className="px-3 py-1.5 bg-slate-800/50 hover:bg-orange-600/20 border border-slate-700 hover:border-orange-500/50 text-slate-300 hover:text-orange-400 rounded-md text-xs font-mono transition-all"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GlobalIndicesPanel({ indices, onAnalyze }: { indices: GlobalIndex[]; onAnalyze: (t: AnalyzeTarget) => void }) {
  const [hoveredSym, setHoveredSym] = useState<string | null>(null);
  const regionColors: Record<string, string> = {
    Americas: 'text-blue-400',
    Europe: 'text-emerald-400',
    'Asia-Pacific': 'text-rose-400',
    Africa: 'text-amber-400',
  };
  const regionBg: Record<string, string> = {
    Americas: 'border-blue-500/20',
    Europe: 'border-emerald-500/20',
    'Asia-Pacific': 'border-rose-500/20',
    Africa: 'border-amber-500/20',
  };

  // Group by region
  const regions = ['Americas', 'Europe', 'Asia-Pacific', 'Africa'] as const;
  const byRegion: Record<string, GlobalIndex[]> = {};
  for (const idx of indices) {
    if (!byRegion[idx.region]) byRegion[idx.region] = [];
    byRegion[idx.region]!.push(idx);
  }

  return (
    <div className="space-y-3 p-1">
      {indices.length > 0 ? regions.map(region => (
        byRegion[region]?.length ? (
          <div key={region}>
            <div className={`text-xs font-bold uppercase tracking-widest ${regionColors[region]} mb-1.5 px-1`}>{region}</div>
            <div className="space-y-1">
              {byRegion[region].map((index) => (
                <div
                  key={index.symbol}
                  onMouseEnter={() => setHoveredSym(index.symbol)}
                  onMouseLeave={() => setHoveredSym(null)}
                  className={`group relative flex items-center justify-between px-3 py-2 bg-slate-800/30 rounded-lg hover:bg-slate-800/70 border ${regionBg[index.region]} hover:border-orange-500/40 transition-all cursor-pointer`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${index.change >= 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-slate-200 truncate">{index.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {index.symbol}
                        <span className={`ml-2 px-1 py-0.5 rounded text-[9px] font-bold ${index.status === 'Open' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
                          {index.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-xs text-slate-200">{index.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                      <div className={`text-[11px] font-bold font-mono ${index.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {index.change >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
                      </div>
                    </div>
                    {/* Analyze button on hover */}
                    {hoveredSym === index.symbol && (
                      <button
                        onClick={() => onAnalyze({ type: 'index', symbol: index.symbol, name: index.name, price: index.value, change: index.change, changePercent: index.changePercent, region: index.region })}
                        className="flex items-center gap-1 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-md transition-all animate-fade-in shadow-lg"
                      >
                        <Zap size={10} /> Analyze
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null
      )) : (
        <div className="text-center py-8 text-slate-500">
          <Activity size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Loading market indices...</p>
        </div>
      )}
    </div>
  );
}



function MostActivePanel({ stocks, onAnalyze }: { stocks: Ticker[]; onAnalyze: (t: AnalyzeTarget) => void }) {
  const [hoveredSym, setHoveredSym] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'volume' | 'gainers' | 'losers'>('volume');

  // We receive volumeLeaders — locally sort to simulate tabs
  const sorted = [...stocks];
  const displayed =
    activeTab === 'gainers' ? sorted.sort((a, b) => b.changePercent - a.changePercent).slice(0, 12) :
      activeTab === 'losers' ? sorted.sort((a, b) => a.changePercent - b.changePercent).slice(0, 12) :
        sorted.sort((a, b) => b.volume - a.volume).slice(0, 12);

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex gap-1 px-2 pt-1 pb-2 shrink-0">
        {(['volume', 'gainers', 'losers'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${activeTab === t
              ? t === 'gainers' ? 'bg-green-600/30 text-green-400 border border-green-500/30'
                : t === 'losers' ? 'bg-red-600/30 text-red-400 border border-red-500/30'
                  : 'bg-orange-600/30 text-orange-400 border border-orange-500/30'
              : 'text-slate-500 hover:text-slate-300'
              }`}>
            {t === 'volume' ? '🔊 Vol' : t === 'gainers' ? '📈 Gainers' : '📉 Losers'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 px-2 pb-2">
        {displayed.length > 0 ? displayed.map((ticker, rank) => (
          <div
            key={ticker.symbol}
            onMouseEnter={() => setHoveredSym(ticker.symbol)}
            onMouseLeave={() => setHoveredSym(null)}
            className="group relative flex items-center gap-2 px-3 py-2 bg-slate-800/30 rounded-lg hover:bg-slate-800/70 border border-slate-700/30 hover:border-orange-500/40 transition-all cursor-pointer"
          >
            {/* Rank */}
            <div className="text-[10px] font-mono text-slate-600 w-4 shrink-0">{rank + 1}</div>

            {/* Avatar */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${ticker.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
              {ticker.symbol.slice(0, 2)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs text-slate-200 font-mono">{ticker.symbol}</span>
                {ticker.change >= 0
                  ? <TrendingUp size={10} className="text-green-400" />
                  : <TrendingDown size={10} className="text-red-400" />}
              </div>
              <div className="text-[10px] text-slate-500">{(ticker.volume / 1e6).toFixed(1)}M shares</div>
            </div>

            <div className="text-right">
              <div className="font-mono text-xs text-slate-200">${ticker.price.toFixed(2)}</div>
              <div className={`text-[11px] font-bold font-mono ${ticker.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {ticker.change >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
              </div>
            </div>

            {/* Analyze Button */}
            {hoveredSym === ticker.symbol && (
              <button
                onClick={() => onAnalyze({ type: 'stock', symbol: ticker.symbol, name: ticker.symbol, price: ticker.price, change: ticker.change, changePercent: ticker.changePercent, volume: ticker.volume })}
                className="flex items-center gap-1 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-md transition-all shadow-lg"
              >
                <Zap size={10} /> Analyze
              </button>
            )}
          </div>
        )) : (
          <div className="text-center py-8 text-slate-500">
            <Activity size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Loading stocks...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NewsPanel({ news }: { news: NewsItem[] }) {
  const sentimentIcons = {
    positive: <TrendingUp size={14} className="text-green-400" />,
    negative: <TrendingDown size={14} className="text-red-400" />,
    neutral: <Activity size={14} className="text-slate-400" />,
  };

  const formatTimestamp = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 24) {
      return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return `${minutes}m ago`;
    }
  };

  return (
    <div className="space-y-3">
      {news.length > 0 ? news.map((newsItem) => (
        <div
          key={newsItem.id}
          className="p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <div className="flex items-start gap-3">
            {sentimentIcons[newsItem.sentiment]}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-200 font-medium mb-1 line-clamp-2">
                {newsItem.headline}
              </div>
              {newsItem.summary && (
                <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                  {newsItem.summary}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-400">{newsItem.source}</span>
                <span>•</span>
                <span>{formatTimestamp(newsItem.publishedAt)}</span>
                {newsItem.tickers && newsItem.tickers.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-orange-400">{newsItem.tickers[0]}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )) : (
        <div className="text-center py-8 text-slate-500">
          <Newspaper size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Loading news...</p>
        </div>
      )}
    </div>
  );
}

function ChartPanel({ symbol = 'AAPL' }: { symbol: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [showIndicators, setShowIndicators] = useState(false);
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const res = await fetch(`/api/gp-charts?symbol=${symbol}&interval=1d&range=3mo`);
        if (res.ok) {
          const data = await res.json();
          setChartData(data);
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }
    };

    fetchChartData();
    const interval = setInterval(fetchChartData, 60000);
    return () => clearInterval(interval);
  }, [symbol]);

  useEffect(() => {
    if (!chartContainerRef.current || !chartData) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.4)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.4)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.4)',
      },
      leftPriceScale: {
        visible: false,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });

    chartInstanceRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries as any;

    // Format price data for lightweight-charts
    const formattedData = chartData.priceData.map((d: any) => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumeData = chartData.priceData.map((d: any) => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? '#26a69a80' : '#ef444480',
    }));

    candlestickSeries.setData(formattedData);
    volumeSeries.setData(volumeData);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [chartData, symbol]);

  return (
    <div className="relative w-full h-full bg-slate-900/50">
      {showIndicators && chartData && (
        <div className="absolute top-4 right-4 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 w-64 shadow-xl z-10">
          <h3 className="text-sm font-bold text-orange-400 mb-3">Technical Analysis</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">RSI (14)</span>
              <span className={`font-bold ${chartData.summary.rsi > 70 ? 'text-red-400' : chartData.summary.rsi < 30 ? 'text-green-400' : 'text-slate-200'}`}>
                {chartData.summary.rsi.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">MACD</span>
              <span className={`font-bold ${chartData.summary.macd.histogram > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {chartData.summary.macd.histogram.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Signal</span>
              <span className={`font-bold ${chartData.summary.macd.macd > chartData.summary.macd.signal ? 'text-green-400' : 'text-red-400'}`}>
                {chartData.summary.macd.signal.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-700 mt-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Trend</span>
                <span className={`font-bold ${chartData.summary.trend.includes('Uptrend') ? 'text-green-400' :
                  chartData.summary.trend.includes('Downtrend') ? 'text-red-400' : 'text-slate-400'
                  }`}>
                  {chartData.summary.trend}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Change</span>
              <span className={`font-bold ${chartData.summary.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {chartData.summary.change >= 0 ? '+' : ''}{chartData.summary.changePercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Volume</span>
              <span className="font-bold text-slate-200">
                {(chartData.summary.volume / 1000000).toFixed(2)}M
              </span>
            </div>
          </div>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full" />
      <button
        onClick={() => setShowIndicators(!showIndicators)}
        className="absolute top-4 left-4 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-orange-400 hover:bg-slate-700 transition-colors"
      >
        {showIndicators ? 'Hide Indicators' : 'Show Indicators'}
      </button>
    </div>
  );
}

function PanelHeader({ title, icon, onMinimize, minimized }: { title: string; icon: React.ReactNode; onMinimize: () => void; minimized: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 border-b border-slate-700/50">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold text-sm text-slate-200">{title}</span>
      </div>
      <button onClick={onMinimize} className="p-1 hover:bg-slate-700 rounded transition-colors">
        {minimized ? <Maximize2 size={14} className="text-slate-400" /> : <Minimize2 size={14} className="text-slate-400" />}
      </button>
    </div>
  );
}

const TerminalPage: React.FC = () => {
  const navigate = useNavigate();
  const [command, setCommand] = useState('');
  const [panels, setPanels] = useState<Panel[]>([
    { id: 'indices', title: 'WEI - World Equity Indices', type: 'indices', size: 'medium', minimized: false },
    { id: 'movers', title: 'MOST - Most Active', type: 'movers', size: 'medium', minimized: false },
    { id: 'chart', title: 'GP - Chart (AAPL)', type: 'chart', size: 'large', minimized: false },
    { id: 'news', title: 'N - News Firehose', type: 'news', size: 'medium', minimized: false },
  ]);
  const [activeTicker, setActiveTicker] = useState('AAPL');
  const [analyzeTarget, setAnalyzeTarget] = useState<AnalyzeTarget | null>(null);

  // Original data states
  const [globalIndices, setGlobalIndices] = useState<GlobalIndex[]>([]);
  const [mostActiveStocks, setMostActiveStocks] = useState<Ticker[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  // New module data states
  const [desData, setDesData] = useState<any>(null);
  const [desLoading, setDesLoading] = useState(false);
  const [faData, setFaData] = useState<any>(null);
  const [faLoading, setFaLoading] = useState(false);
  const [ecoData, setEcoData] = useState<any[]>([]);
  const [fxData, setFxData] = useState<any>(null);
  const [cryptoData, setCryptoData] = useState<any>(null);
  const [yieldData, setYieldData] = useState<any>(null);
  const [screenerData, setScreenerData] = useState<any>(null);

  // ── Data fetchers for original panels ─────────────────────────────────────
  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const res = await fetch('/api/wei-indices');
        if (res.ok) setGlobalIndices((await res.json()).indices || []);
      } catch { }
    };
    fetchIndices();
    const t = setInterval(fetchIndices, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchMostActive = async () => {
      try {
        const res = await fetch('/api/most-active?limit=15');
        if (res.ok) setMostActiveStocks((await res.json()).volumeLeaders || []);
      } catch { }
    };
    fetchMostActive();
    const t = setInterval(fetchMostActive, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news-firehose?limit=10');
        if (res.ok) setNewsItems((await res.json()).items || []);
      } catch { }
    };
    fetchNews();
    const t = setInterval(fetchNews, 120000);
    return () => clearInterval(t);
  }, []);

  // ── New module fetchers ─────────────────────────────────────────────────────
  const fetchDES = async (ticker: string) => {
    setDesLoading(true);
    try {
      const res = await fetch(`/api/des-company?symbol=${ticker}`);
      if (res.ok) setDesData(await res.json());
    } catch { }
    setDesLoading(false);
  };

  const fetchFA = async (ticker: string) => {
    setFaLoading(true);
    try {
      const res = await fetch('/api/finance-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });
      if (res.ok) setFaData(await res.json());
    } catch { }
    setFaLoading(false);
  };

  const fetchECO = async () => {
    try {
      const res = await fetch('/api/eco-calendar');
      if (res.ok) setEcoData((await res.json()).events || []);
    } catch { }
  };

  const fetchFX = async () => {
    try {
      const res = await fetch('/api/fx-monitor');
      if (res.ok) setFxData(await res.json());
    } catch { }
  };

  const fetchCrypto = async () => {
    try {
      const res = await fetch('/api/crypto-dashboard');
      if (res.ok) setCryptoData(await res.json());
    } catch { }
  };

  const fetchYield = async () => {
    try {
      const res = await fetch('/api/yield-curve');
      if (res.ok) setYieldData(await res.json());
    } catch { }
  };

  const fetchScreener = async () => {
    try {
      const res = await fetch('/api/equity-screener?type=gainers');
      if (res.ok) setScreenerData(await res.json());
    } catch { }
  };

  const allSuggestions = Object.entries(BLOOMBERG_COMMANDS).map(([cmd, info]) => ({
    cmd,
    name: info.name,
    desc: info.desc,
  }));

  const handleCommandSubmit = (cmd: string) => {
    const raw = cmd.trim();
    if (!raw) return;
    const parts = raw.toUpperCase().split(/\s+/);
    const upperCmd = parts[0];
    const tickerArg = parts[1]; // e.g. "GP AAPL" → tickerArg = "AAPL"
    setCommand(upperCmd + (tickerArg ? ' ' + tickerArg : ''));

    // If a ticker was provided inline (e.g. "GP AAPL"), update activeTicker first
    if (tickerArg) setActiveTicker(tickerArg);

    // Check if it's a plain ticker (e.g. "AAPL", "BTC-USD", "^GSPC")
    const isPlainTicker = /^[A-Z0-9^.(\-]{1,12}$/.test(upperCmd) && !BLOOMBERG_COMMANDS[upperCmd as BloombergCommand];
    if (isPlainTicker) {
      setActiveTicker(upperCmd);
      setPanels((prev) =>
        prev.map((p) => (p.type === 'chart' ? { ...p, title: `GP - Chart (${upperCmd})` } : p))
      );
      return;
    }

    switch (upperCmd) {
      case 'WEI':
        setPanels([{ id: 'indices', title: 'WEI - World Equity Indices', type: 'indices', size: 'full', minimized: false }]);
        break;
      case 'MOST':
        setPanels([{ id: 'movers', title: 'MOST - Most Active', type: 'movers', size: 'full', minimized: false }]);
        break;
      case 'N': case 'NSE':
        setPanels([{ id: 'news', title: `${upperCmd} - News`, type: 'news', size: 'full', minimized: false }]);
        break;
      case 'GP':
        setPanels([{ id: 'chart', title: `GP - Chart (${activeTicker})`, type: 'chart', size: 'full', minimized: false }]);
        break;
      case 'DES':
        fetchDES(activeTicker);
        setPanels([{ id: 'des', title: `DES - ${activeTicker} Profile`, type: 'des', size: 'full', minimized: false, tickerArg: activeTicker }]);
        break;
      case 'FA':
        fetchFA(activeTicker);
        setPanels([{ id: 'fa', title: `FA - ${activeTicker} Financial Analysis`, type: 'fa', size: 'full', minimized: false, tickerArg: activeTicker }]);
        break;
      case 'ECO':
        fetchECO();
        setPanels([{ id: 'eco', title: 'ECO - Economic Calendar', type: 'eco', size: 'full', minimized: false }]);
        break;
      case 'WFX':
        fetchFX();
        setPanels([{ id: 'fx', title: 'WFX - FX Monitor', type: 'fx', size: 'full', minimized: false }]);
        break;
      case 'CRYP':
        fetchCrypto();
        setPanels([{ id: 'crypto', title: 'CRYP - Crypto Dashboard', type: 'crypto', size: 'full', minimized: false }]);
        break;
      case 'GC':
        fetchYield();
        setPanels([{ id: 'yieldcurve', title: 'GC - US Yield Curve', type: 'yieldcurve', size: 'full', minimized: false }]);
        break;
      case 'EQS':
        fetchScreener();
        setPanels([{ id: 'screener', title: 'EQS - Equity Screener', type: 'screener', size: 'full', minimized: false }]);
        break;
      case 'HOME': case 'MON':
        setPanels([
          { id: 'indices', title: 'WEI - World Equity Indices', type: 'indices', size: 'medium', minimized: false },
          { id: 'movers', title: 'MOST - Most Active', type: 'movers', size: 'medium', minimized: false },
          { id: 'chart', title: `GP - Chart (${activeTicker})`, type: 'chart', size: 'large', minimized: false },
          { id: 'news', title: 'N - News Firehose', type: 'news', size: 'medium', minimized: false },
        ]);
        break;
      default:
        console.log('Command:', upperCmd);
    }
  };

  const togglePanel = (id: string) => {
    setPanels((prevPanels) => prevPanels.map((p) => (p.id === id ? { ...p, minimized: !p.minimized } : p)));
  };

  const panelIcons: Record<string, React.ReactNode> = {
    indices: <Globe size={16} className="text-blue-400" />,
    movers: <TrendingUp size={16} className="text-green-400" />,
    chart: <LineChart size={16} className="text-orange-400" />,
    news: <Newspaper size={16} className="text-purple-400" />,
    watchlist: <Activity size={16} className="text-cyan-400" />,
    command: <Terminal size={16} className="text-orange-400" />,
    des: <Activity size={16} className="text-sky-400" />,
    fa: <TrendingUp size={16} className="text-emerald-400" />,
    eco: <Globe size={16} className="text-yellow-400" />,
    fx: <Globe size={16} className="text-cyan-400" />,
    crypto: <TrendingUp size={16} className="text-purple-400" />,
    yieldcurve: <LineChart size={16} className="text-rose-400" />,
    screener: <Activity size={16} className="text-lime-400" />,
  };

  const getPanelContent = (panel: Panel) => {
    if (panel.minimized) return null;

    switch (panel.type) {
      case 'indices': return <GlobalIndicesPanel indices={globalIndices} onAnalyze={setAnalyzeTarget} />;
      case 'movers': return <MostActivePanel stocks={mostActiveStocks} onAnalyze={setAnalyzeTarget} />;
      case 'chart': return <ChartPanel symbol={activeTicker} />;
      case 'news': return <NewsPanel news={newsItems} />;

      case 'des':
        return (
          <div className="p-4 overflow-y-auto h-full">
            {desLoading ? (
              <div className="text-center py-12 text-slate-400"><Activity size={32} className="mx-auto mb-3 animate-spin" /><p>Loading company profile...</p></div>
            ) : desData ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">{desData.name ?? activeTicker}</h2>
                    <p className="text-sm text-slate-400">{desData.sector} › {desData.industry}</p>
                    <p className="text-xs text-slate-500 mt-1">{desData.exchange} · {desData.currency}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-orange-400">${desData.price?.toFixed(2) ?? '—'}</div>
                    <div className={`text-sm font-semibold ${(desData.change ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(desData.change ?? 0) >= 0 ? '+' : ''}{desData.changePercent?.toFixed(2) ?? 0}%
                    </div>
                  </div>
                </div>
                {desData.description && <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-orange-500/40 pl-3">{desData.description.slice(0, 600)}...</p>}
                <div className="grid grid-cols-3 gap-3">
                  {[['Market Cap', desData.marketCap ? `$${(desData.marketCap / 1e9).toFixed(1)}B` : 'N/A'],
                  ['P/E Ratio', desData.trailingPE?.toFixed(2) ?? 'N/A'],
                  ['52W High', desData.fiftyTwoWeekHigh ? `$${desData.fiftyTwoWeekHigh.toFixed(2)}` : 'N/A'],
                  ['52W Low', desData.fiftyTwoWeekLow ? `$${desData.fiftyTwoWeekLow.toFixed(2)}` : 'N/A'],
                  ['Dividend Yield', desData.dividendYield ? `${(desData.dividendYield * 100).toFixed(2)}%` : 'N/A'],
                  ['Beta', desData.beta?.toFixed(2) ?? 'N/A'],
                  ['Employees', desData.employees?.toLocaleString() ?? 'N/A'],
                  ['Revenue', desData.revenue ? `$${(desData.revenue / 1e9).toFixed(1)}B` : 'N/A'],
                  ['EPS', desData.eps?.toFixed(2) ?? 'N/A'],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">{label}</div>
                      <div className="font-mono text-sm font-bold text-slate-200">{value}</div>
                    </div>
                  ))}
                </div>
                {desData.website && <a href={desData.website} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-400 hover:underline">{desData.website}</a>}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Activity size={32} className="mx-auto mb-3 opacity-40" />
                <p>Type a ticker then run <span className="text-orange-400 font-mono">DES</span></p>
              </div>
            )}
          </div>
        );

      case 'fa':
        return (
          <div className="p-4 overflow-y-auto h-full">
            {faLoading ? (
              <div className="text-center py-12 text-slate-400"><Activity size={32} className="mx-auto mb-3 animate-spin" /><p>Generating financial analysis...</p></div>
            ) : faData?.content ? (
              <div className="space-y-1">
                <div className="flex gap-2 mb-4 flex-wrap">
                  {faData.citations?.map((url: string) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded px-2 py-1 text-orange-400 transition-colors">
                      {new URL(url).pathname.slice(1)}
                    </a>
                  ))}
                </div>
                {faData.content.split('\n').map((line: string, i: number) => {
                  if (line.startsWith('## ')) return <h3 key={i} className="text-base font-bold text-orange-400 mt-4 mb-2 border-b border-orange-500/20 pb-1">{line.slice(3)}</h3>;
                  if (line.startsWith('- **')) return <p key={i} className="text-sm text-slate-300 py-0.5 pl-2">{line}</p>;
                  if (line.startsWith('- ')) return <p key={i} className="text-sm text-slate-400 py-0.5 pl-2 border-l border-slate-700">{line.slice(2)}</p>;
                  if (line.trim() === '') return <div key={i} className="h-1" />;
                  return <p key={i} className="text-sm text-slate-300">{line}</p>;
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <TrendingUp size={32} className="mx-auto mb-3 opacity-40" />
                <p>Type a ticker then run <span className="text-orange-400 font-mono">FA</span></p>
              </div>
            )}
          </div>
        );

      case 'eco':
        return (
          <div className="p-4 overflow-y-auto h-full">
            {ecoData.length > 0 ? (
              <div className="space-y-2">
                {ecoData.map((evt: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg hover:bg-slate-800/60 transition-colors">
                    <div className="text-xs font-mono text-slate-400 w-20 shrink-0">{evt.date}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-200">{evt.event}</div>
                      <div className="text-xs text-slate-500">{evt.country} · {evt.importance}</div>
                    </div>
                    <div className="text-right text-xs">
                      {evt.actual && <div className="text-orange-400 font-mono">Act: {evt.actual}</div>}
                      {evt.forecast && <div className="text-slate-400">Exp: {evt.forecast}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Globe size={32} className="mx-auto mb-3 opacity-40" />
                <p>Loading economic calendar...</p>
              </div>
            )}
          </div>
        );

      case 'fx':
        return (
          <div className="p-4 overflow-y-auto h-full">
            {fxData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {fxData.rates && Object.entries(fxData.rates).slice(0, 24).map(([cur, rate]: [string, any]) => (
                    <div key={cur} className="bg-slate-800/50 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <div className="font-mono font-bold text-sm text-white">USD/{cur}</div>
                        <div className="text-xs text-slate-500">vs USD</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-orange-400">{Number(rate).toFixed(4)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {fxData.centralBankRates && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 mb-2">Central Bank Rates</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {fxData.centralBankRates.map((cb: any) => (
                        <div key={cb.bank} className="bg-slate-800/50 rounded-lg p-2 text-xs">
                          <div className="font-bold text-slate-200">{cb.bank}</div>
                          <div className="text-orange-400 font-mono text-base">{cb.rate}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Globe size={32} className="mx-auto mb-3 opacity-40" />
                <p>Loading FX data...</p>
              </div>
            )}
          </div>
        );

      case 'crypto':
        return (
          <div className="p-4 overflow-y-auto h-full">
            {cryptoData ? (
              <div className="space-y-4">
                {cryptoData.globalStats && (
                  <div className="grid grid-cols-3 gap-3">
                    {[['Total Market Cap', `$${(cryptoData.globalStats.totalMarketCap / 1e12).toFixed(2)}T`],
                    ['24h Volume', `$${(cryptoData.globalStats.totalVolume24h / 1e9).toFixed(1)}B`],
                    ['BTC Dominance', `${cryptoData.globalStats.btcDominance?.toFixed(1)}%`],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500">{label}</div>
                        <div className="font-mono text-orange-400 font-bold">{value}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  {cryptoData.coins?.map((coin: any) => (
                    <div key={coin.id} className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg hover:bg-slate-800/60 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-500/30 flex items-center justify-center text-xs font-bold text-orange-400">
                        {coin.symbol?.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-slate-200">{coin.name}</div>
                        <div className="text-xs text-slate-500">{coin.symbol?.toUpperCase()} · MCap: ${(coin.marketCap / 1e9).toFixed(1)}B</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">${coin.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                        <div className={`text-xs font-semibold ${(coin.change24h ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(coin.change24h ?? 0) >= 0 ? '+' : ''}{coin.change24h?.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <TrendingUp size={32} className="mx-auto mb-3 opacity-40" />
                <p>Loading crypto data...</p>
              </div>
            )}
          </div>
        );

      case 'yieldcurve':
        return (
          <div className="p-4 overflow-y-auto h-full">
            {yieldData?.yields ? (
              <div className="space-y-4">
                <div className="flex items-end gap-2 h-48 border-b border-slate-700 pb-2">
                  {yieldData.yields.map((y: any) => {
                    const maxYield = Math.max(...yieldData.yields.map((y: any) => y.yield));
                    const barH = maxYield > 0 ? (y.yield / maxYield) * 100 : 0;
                    return (
                      <div key={y.maturity} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-xs text-orange-400 font-mono">{y.yield.toFixed(2)}%</div>
                        <div
                          className="w-full bg-gradient-to-t from-orange-600 to-amber-400 rounded-t"
                          style={{ height: `${barH}%`, minHeight: 4 }}
                        />
                        <div className="text-xs text-slate-500">{y.maturity}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-slate-500 text-center">US Treasury Yield Curve · Updated {yieldData.asOf ?? 'today'}</div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <LineChart size={32} className="mx-auto mb-3 opacity-40" />
                <p>Loading yield curve...</p>
              </div>
            )}
          </div>
        );

      case 'screener':
        return (
          <div className="p-4 overflow-y-auto h-full">
            {screenerData ? (
              <div className="space-y-4">
                {['gainers', 'losers', 'volumeLeaders'].map((listKey) => (
                  <div key={listKey}>
                    <h3 className={`text-sm font-bold mb-2 ${listKey === 'gainers' ? 'text-green-400' : listKey === 'losers' ? 'text-red-400' : 'text-blue-400'
                      }`}>
                      {listKey === 'gainers' ? 'Top Gainers' : listKey === 'losers' ? 'Top Losers' : 'Volume Leaders'}
                    </h3>
                    <div className="space-y-1">
                      {screenerData[listKey]?.slice(0, 5).map((s: any) => (
                        <div key={s.symbol} className="flex items-center justify-between p-2 bg-slate-800/40 rounded hover:bg-slate-800/60 transition-colors">
                          <div>
                            <span className="font-mono font-bold text-sm text-slate-200">{s.symbol}</span>
                            <span className="text-xs text-slate-500 ml-2">{s.name?.slice(0, 20)}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm">${s.price?.toFixed(2)}</div>
                            <div className={`text-xs font-bold ${(s.changePercent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(s.changePercent ?? 0) >= 0 ? '+' : ''}{s.changePercent?.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Activity size={32} className="mx-auto mb-3 opacity-40" />
                <p>Loading screener data...</p>
              </div>
            )}
          </div>
        );

      default:
        return <div className="p-4 text-slate-500">Panel content coming soon...</div>;
    }
  };

  const getPanelSize = (size: Panel['size']) => {
    switch (size) {
      case 'small':
        return 'col-span-1 row-span-1';
      case 'medium':
        return 'col-span-1 row-span-2';
      case 'large':
        return 'col-span-2 row-span-2';
      case 'full':
        return 'col-span-full row-span-2';
      default:
        return 'col-span-1 row-span-1';
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="h-14 bg-slate-900/90 border-b border-orange-500/20 flex items-center px-4 gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          title="Back to Home"
        >
          <ChevronRight size={20} className="text-orange-400 rotate-180" />
        </button>

        <div className="flex items-center gap-2">
          <Terminal size={22} className="text-orange-500" />
          <span className="font-bold text-lg text-orange-400">STRATIG <span className="text-orange-300">TERMINAL</span></span>
        </div>

        <div className="flex-1 max-w-2xl">
          <CommandInput
            value={command}
            onChange={setCommand}
            onSubmit={handleCommandSubmit}
            suggestions={allSuggestions}
          />
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors" title="Notifications">
            <Bell size={18} className="text-slate-400" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={18} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* ── Left Sidebar - Mnemonics ── */}
        <div className="w-56 bg-slate-900/50 border-r border-slate-800 overflow-y-auto p-4">
          <div className="flex items-center gap-2 mb-4">
            <Command size={16} className="text-orange-400" />
            <span className="text-sm font-semibold text-slate-300">Quick Commands</span>
          </div>
          <MnemonicButtons onSelectCommand={(cmd) => handleCommandSubmit(cmd)} />
          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => navigate('/alt-data')}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all hover:bg-orange-600/20 border border-slate-700 hover:border-orange-500/50 text-slate-400 hover:text-orange-400"
            >
              <Activity size={13} className="text-orange-400" />
              <span>ALT DATA</span>
              <span className="ml-auto text-[10px] text-slate-600">Consumer Intelligence</span>
            </button>
          </div>
        </div>

        {/* ── Main Grid - Panels ── */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-4 h-full auto-rows-[300px]">
            {panels.map((panel) => (
              <div
                key={panel.id}
                className={`${getPanelSize(panel.size)} bg-slate-900/80 border border-slate-800/50 rounded-lg overflow-hidden flex flex-col`}
              >
                <PanelHeader
                  title={panel.title}
                  icon={panelIcons[panel.type]}
                  minimized={panel.minimized}
                  onMinimize={() => togglePanel(panel.id)}
                />
                {getPanelContent(panel)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Ticker Tape ── */}
      <div className="fixed bottom-0 left-0 right-0 h-10 bg-slate-900/95 border-t border-orange-500/20 flex items-center overflow-hidden">
        <div className="flex items-center animate-marquee whitespace-nowrap">
          {globalIndices.length > 0 ? globalIndices.slice(0, 15).map((idx, i) => (
            <React.Fragment key={idx.symbol}>
              <div className="flex items-center gap-2 px-4 text-sm">
                <span className="font-semibold text-slate-300">{idx.symbol}</span>
                <span className="font-mono">{idx.value.toLocaleString()}</span>
                <span className={idx.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {idx.change >= 0 ? '+' : ''}
                  {idx.changePercent.toFixed(2)}%
                </span>
              </div>
              {i < 14 && <div className="w-px h-6 bg-slate-700" />}
            </React.Fragment>
          )) : (
            <div className="px-4 text-sm text-slate-500">Loading market data...</div>
          )}
        </div>
      </div>

      {/* ── Analyze Modal ── */}
      <AnalyzeModal
        target={analyzeTarget}
        onClose={() => setAnalyzeTarget(null)}
        onRunCommand={(cmd: string) => {
          if (analyzeTarget?.type === 'stock') setActiveTicker(analyzeTarget.symbol);
          handleCommandSubmit(cmd);
        }}
      />

      <style>{`
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default TerminalPage;
