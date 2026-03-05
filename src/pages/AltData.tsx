import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';
import {
    Search, RefreshCw, ChevronRight, ExternalLink, Clock,
    TrendingUp, TrendingDown, Minus, Database, AlertCircle,
    BarChart2, Users, ShoppingCart, Activity, Zap, X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Metric { name: string; unit: string; d91: number; d28: number; d7: number; }
interface Peer { ticker: string; name: string; d91: number; d28: number; d7: number; price: number; marketCap: number; }
interface ChartPt { date: string; close: number; demandIdx: number; }
interface APIData {
    ticker: string; sector: string;
    company: { name: string; description: string; employees: number; storeCount: number; marketCap: number; revenue: number; revenueGrowth: number; price: number; change: number; changePercent: number; exchange: string; website: string; };
    metrics: Metric[]; peers: Peer[];
    chartData: ChartPt[]; retailIndex: { date: string; value: number }[];
    lastUpdated: string; sources: string[];
}
interface SearchResult { symbol: string; name: string; type: string; exchange: string; }

// ─── Category Presets (all visible, scrollable) ────────────────────────────────
const PRESET_GROUPS = [
    { label: 'Retail', tickers: ['BURL', 'TJX', 'ROST', 'COST', 'WMT', 'TGT', 'DG', 'DLTR', 'FIVE', 'KSS', 'M', 'JWN'] },
    { label: 'Tech', tickers: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'INTC', 'CRM', 'ORCL', 'NFLX'] },
    { label: 'Finance', tickers: ['JPM', 'GS', 'BAC', 'WFC', 'MS', 'BLK', 'AXP', 'V', 'MA', 'PYPL', 'C', 'BRK-B'] },
    { label: 'Crypto', tickers: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'DOGE-USD'] },
    { label: 'Energy', tickers: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PSX', 'VLO', 'MPC'] },
    { label: 'Health', tickers: ['JNJ', 'PFE', 'ABBV', 'MRK', 'LLY', 'BMY', 'UNH', 'CVS'] },
];

// ─── Primitives ───────────────────────────────────────────────────────────────
const fmtV = (v: number, unit: string) => {
    if (unit === '%') return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
    if (unit === '$') return `$${Math.abs(v).toFixed(2)}`;
    if (unit === 'x') return `${v.toFixed(2)}x`;
    if (unit === 'K') return `${v.toFixed(0)}K`;
    if (unit === 'K/wk') return `${v.toFixed(1)}K`;
    return `${v}`;
};
const fmtB = (v: number) =>
    v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T`
        : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B`
            : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M`
                : `$${v.toFixed(0)}`;

function Sk({ w = 'w-full', h = 'h-5' }: { w?: string; h?: string }) {
    return <div className={`${w} ${h} rounded animate-pulse`} style={{ background: '#1a1a1a' }} />;
}

function Delta({ v, unit }: { v: number; unit: string }) {
    const isPos = unit === '%' ? v > 0.5 : v > 0;
    const isNeg = unit === '%' ? v < -0.5 : v < 0;
    const cls = isPos ? '#00FF00' : isNeg ? '#FF4040' : '#888';
    const Icon = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;
    return (
        <div className="flex items-center justify-end gap-1 font-mono text-sm font-bold" style={{ color: cls }}>
            <Icon size={10} />
            <span>{fmtV(v, unit)}</span>
        </div>
    );
}

// ─── Real-time Symbol Search ───────────────────────────────────────────────────
function SymbolSearchBar({ onSelect, currentTicker, currentName }: {
    onSelect: (sym: string) => void;
    currentTicker: string;
    currentName: string;
}) {
    const [q, setQ] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [open, setOpen] = useState(false);
    const [idx, setIdx] = useState(0);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounced Yahoo Finance symbol search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!q.trim()) { setResults([]); setOpen(false); return; }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const r = await fetch(`/api/alt-data/search?q=${encodeURIComponent(q)}`);
                if (r.ok) {
                    const data: SearchResult[] = await r.json();
                    setResults(data);
                    setOpen(data.length > 0);
                    setIdx(0);
                }
            } catch { /* silent */ }
            setSearching(false);
        }, 300);
    }, [q]);

    const pick = (sym: string) => {
        onSelect(sym);
        setQ('');
        setOpen(false);
        setResults([]);
    };

    const typeColor = (t: string) =>
        t === 'EQUITY' ? '#4488FF' : t === 'CRYPTOCURRENCY' ? '#a78bfa' : t === 'ETF' ? '#10b981' : '#888';

    return (
        <div className="relative flex-1 max-w-md">
            <div className="flex items-center rounded border px-3 py-2 gap-2"
                style={{ background: '#0d0d0d', borderColor: open ? '#FF8C00' : '#333', transition: 'border-color .15s' }}>
                <Search size={14} style={{ color: '#666', flexShrink: 0 }} />
                <input
                    ref={inputRef}
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 180)}
                    onKeyDown={e => {
                        if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
                        else if (e.key === 'Enter') {
                            if (open && results[idx]) pick(results[idx].symbol);
                            else if (q.trim()) pick(q.trim().toUpperCase());
                            e.preventDefault();
                        }
                        else if (e.key === 'Escape') setOpen(false);
                    }}
                    placeholder={`Search any stock, ETF, crypto… (now: ${currentTicker})`}
                    className="flex-1 bg-transparent text-sm font-mono focus:outline-none"
                    style={{ color: '#E6E6E6' }}
                />
                {searching && <RefreshCw size={12} className="animate-spin shrink-0" style={{ color: '#FF8C00' }} />}
                {q && <button onMouseDown={() => { setQ(''); setOpen(false); inputRef.current?.focus(); }}>
                    <X size={13} style={{ color: '#555' }} />
                </button>}
            </div>

            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border overflow-hidden z-50"
                    style={{ background: '#0d0d0d', borderColor: '#333', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}>
                    <div className="px-3 py-1.5 border-b text-[10px] uppercase tracking-widest flex justify-between"
                        style={{ color: '#444', borderColor: '#1a1a1a' }}>
                        <span>Yahoo Finance Live Results</span>
                        <span>↑↓ Enter to select</span>
                    </div>
                    {results.map((r, i) => (
                        <button key={r.symbol} onMouseDown={() => pick(r.symbol)} onMouseEnter={() => setIdx(i)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b"
                            style={{ background: i === idx ? 'rgba(255,140,0,0.12)' : 'transparent', borderColor: '#151515' }}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-sm" style={{ color: i === idx ? '#FF8C00' : '#E6E6E6' }}>{r.symbol}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(0,0,0,0.4)', color: typeColor(r.type) }}>{r.type}</span>
                                </div>
                                <div className="text-xs truncate" style={{ color: '#666' }}>{r.name} · {r.exchange}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
        </div>
    );
}

// ─── Company Hero Banner ────────────────────────────────────────────────────────
function CompanyHero({ data, loading }: { data: APIData | null; loading: boolean }) {
    if (loading && !data) {
        return (
            <div className="px-6 py-5 border-b" style={{ background: '#050505', borderColor: '#1a1a1a' }}>
                <Sk h="h-8 w-80" /><div className="mt-2"><Sk h="h-4 w-56" /></div>
            </div>
        );
    }
    if (!data) return null;
    const isUp = data.company.changePercent >= 0;
    return (
        <div className="px-6 py-4 border-b" style={{ background: 'linear-gradient(to right, #070707, #000)', borderColor: '#1a1a1a' }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    {/* Big name display */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-3xl font-black font-mono tracking-tight" style={{ color: '#FF8C00' }}>{data.ticker}</span>
                        <div className="h-8 w-px" style={{ background: '#282828' }} />
                        <span className="text-xl font-bold" style={{ color: '#E6E6E6' }}>{data.company.name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs font-mono" style={{ color: '#666' }}>
                        <span className="px-2 py-0.5 rounded" style={{ background: '#111', border: '1px solid #282828', color: '#FF8C00' }}>{data.sector}</span>
                        <span>{data.company.exchange}</span>
                        {data.company.storeCount > 1 && <span>~{data.company.storeCount.toLocaleString()} est. locations</span>}
                        {data.company.employees > 0 && <span>{(data.company.employees).toLocaleString()} employees</span>}
                        {data.company.website && (
                            <a href={data.company.website} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-orange-400 transition-colors">
                                <ExternalLink size={10} />{data.company.website.replace(/https?:\/\//, '')}
                            </a>
                        )}
                    </div>
                    {data.company.description && (
                        <p className="mt-2 text-xs leading-relaxed max-w-2xl" style={{ color: '#555', borderLeft: '2px solid #FF8C0033', paddingLeft: 8 }}>
                            {data.company.description.slice(0, 280)}{data.company.description.length > 280 ? '…' : ''}
                        </p>
                    )}
                </div>
                {/* Live price block */}
                <div className="text-right shrink-0">
                    <div className="text-4xl font-black font-mono leading-none" style={{ color: '#E6E6E6' }}>
                        {data.company.price > 0 ? `$${data.company.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-1.5" style={{ color: isUp ? '#00FF00' : '#FF4040' }}>
                        {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span className="font-mono font-bold text-base">{isUp ? '+' : ''}{data.company.change.toFixed(2)}</span>
                        <span className="font-mono text-sm">({isUp ? '+' : ''}{data.company.changePercent.toFixed(2)}%)</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px]" style={{ color: '#333' }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block bg-green-500 animate-pulse" />
                        Live · Yahoo Finance
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Metrics Table ─────────────────────────────────────────────────────────────
const METRIC_ICONS: Record<string, React.ReactNode> = {
    'Observed Sales Growth': <TrendingUp size={12} style={{ color: '#FF8C00' }} />,
    'Observed Transactions': <ShoppingCart size={12} style={{ color: '#4488FF' }} />,
    'Observed Customers': <Users size={12} style={{ color: '#a78bfa' }} />,
    'Avg Transaction Value': <Zap size={12} style={{ color: '#f59e0b' }} />,
    'Transactions per Customer': <Activity size={12} style={{ color: '#06b6d4' }} />,
    'Sales per Customer': <BarChart2 size={12} style={{ color: '#10b981' }} />,
    'Est. Store Visits': <Database size={12} style={{ color: '#f43f5e' }} />,
};

function MetricsTable({ metrics, loading }: { metrics: Metric[]; loading: boolean }) {
    return (
        <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#282828' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#0d0d0d', borderBottom: '1px solid #282828' }}>
                        <th className="text-left px-4 py-3 text-xs uppercase tracking-widest font-bold" style={{ color: '#FF8C00', width: '44%' }}>
                            Alternative Metric <span className="normal-case font-normal text-[10px]" style={{ color: '#444' }}>(Proxied from real market data)</span>
                        </th>
                        {['91-Day', '28-Day', '7-Day'].map(h => (
                            <th key={h} className="text-right px-4 py-3 text-xs uppercase tracking-widest font-bold" style={{ color: '#666' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {loading
                        ? Array(7).fill(0).map((_, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                                <td className="px-4 py-3"><Sk h="h-4" /></td>
                                {[0, 1, 2].map(j => <td key={j} className="px-4 py-3"><Sk w="w-20" h="h-4" /></td>)}
                            </tr>
                        ))
                        : metrics.map((m, i) => (
                            <tr key={m.name}
                                className="group cursor-default transition-colors"
                                style={{ borderBottom: i < metrics.length - 1 ? '1px solid #111' : 'none' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#0d0d0d')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {METRIC_ICONS[m.name]}
                                        <span className="font-mono text-sm" style={{ color: '#D0D0D0' }}>{m.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3"><Delta v={m.d91} unit={m.unit} /></td>
                                <td className="px-4 py-3"><Delta v={m.d28} unit={m.unit} /></td>
                                <td className="px-4 py-3"><Delta v={m.d7} unit={m.unit} /></td>
                            </tr>
                        ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Competitor Table ──────────────────────────────────────────────────────────
function CompetitorTable({ peers, currentTicker, loading }: { peers: Peer[]; currentTicker: string; loading: boolean }) {
    return (
        <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#282828' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#0d0d0d', borderBottom: '1px solid #282828' }}>
                        <th className="text-left px-4 py-3 text-xs uppercase tracking-widest font-bold" style={{ color: '#4488FF' }}>Company</th>
                        <th className="text-right px-4 py-3 text-xs" style={{ color: '#666' }}>Price</th>
                        <th className="text-right px-4 py-3 text-xs" style={{ color: '#666' }}>Mkt Cap</th>
                        <th className="text-right px-4 py-3 text-xs" style={{ color: '#666' }}>91D</th>
                        <th className="text-right px-4 py-3 text-xs" style={{ color: '#666' }}>28D</th>
                        <th className="text-right px-4 py-3 text-xs" style={{ color: '#666' }}>7D</th>
                    </tr>
                </thead>
                <tbody>
                    {loading
                        ? Array(5).fill(0).map((_, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                                {Array(6).fill(0).map((_, j) => <td key={j} className="px-4 py-3"><Sk h="h-4" /></td>)}
                            </tr>
                        ))
                        : peers.map((p, i) => (
                            <tr key={p.ticker}
                                style={{ borderBottom: i < peers.length - 1 ? '1px solid #111' : 'none', background: p.ticker === currentTicker ? 'rgba(255,140,0,0.06)' : 'transparent' }}
                                onMouseEnter={e => { if (p.ticker !== currentTicker) e.currentTarget.style.background = '#0d0d0d'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = p.ticker === currentTicker ? 'rgba(255,140,0,0.06)' : 'transparent'; }}>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {p.ticker === currentTicker && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#FF8C00' }} />}
                                        <span className="font-mono font-black text-sm" style={{ color: p.ticker === currentTicker ? '#FF8C00' : '#E6E6E6' }}>{p.ticker}</span>
                                        <span className="text-xs truncate max-w-[120px]" style={{ color: '#555' }}>{p.name}</span>
                                    </div>
                                </td>
                                <td className="text-right px-4 py-3 font-mono text-sm" style={{ color: '#E6E6E6' }}>{p.price > 0 ? `$${p.price.toFixed(2)}` : '—'}</td>
                                <td className="text-right px-4 py-3 font-mono text-xs" style={{ color: '#666' }}>{p.marketCap > 0 ? fmtB(p.marketCap) : '—'}</td>
                                <td className="px-4 py-3"><Delta v={p.d91} unit="%" /></td>
                                <td className="px-4 py-3"><Delta v={p.d28} unit="%" /></td>
                                <td className="px-4 py-3"><Delta v={p.d7} unit="%" /></td>
                            </tr>
                        ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── TradingView Chart ─────────────────────────────────────────────────────────
function PriceChart({ data }: { data: ChartPt[] }) {
    const el = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!el.current || !data.length) return;
        const c = createChart(el.current, {
            layout: { background: { type: ColorType.Solid, color: '#000' }, textColor: '#555', fontFamily: 'monospace' },
            grid: { vertLines: { color: '#0d0d0d', style: LineStyle.Dashed }, horzLines: { color: '#0d0d0d', style: LineStyle.Dashed } },
            rightPriceScale: { borderColor: '#1a1a1a' },
            timeScale: { borderColor: '#1a1a1a', timeVisible: false },
            width: el.current.clientWidth,
            height: el.current.clientHeight,
        });
        const ls = c.addAreaSeries({ lineColor: '#FF8C00', topColor: 'rgba(255,140,0,0.18)', bottomColor: 'rgba(255,140,0,0)', lineWidth: 2 });
        ls.setData(data.map(d => ({ time: d.date as any, value: d.close })));
        const ds = c.addLineSeries({ color: '#00FF00', lineWidth: 1, title: 'Demand', priceLineVisible: false, lastValueVisible: false });
        ds.setData(data.map(d => ({ time: d.date as any, value: d.demandIdx })));
        c.timeScale().fitContent();
        const ro = new ResizeObserver(() => { if (el.current) c.applyOptions({ width: el.current.clientWidth }); });
        ro.observe(el.current);
        return () => { c.remove(); ro.disconnect(); };
    }, [data]);
    return <div ref={el} className="w-full h-full" />;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#4488FF' }: { data: number[]; color?: string }) {
    if (data.length < 2) return null;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const W = 100, H = 30;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`).join(' ');
    return (
        <svg width={W} height={H} className="block">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AltDataPage() {
    const navigate = useNavigate();
    const [ticker, setTicker] = useState('BURL');
    const [data, setData] = useState<APIData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState(60);
    const [activeGroup, setActiveGroup] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cdRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const load = useCallback(async (t: string) => {
        setLoading(true); setError('');
        try {
            const r = await fetch(`/api/alt-data?ticker=${encodeURIComponent(t)}`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const d = await r.json();
            if (d.error) throw new Error(d.error);
            setData(d);
            setLastRefresh(new Date());
            setCountdown(60);
        } catch (e: any) { setError(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { load(ticker); }, [ticker, load]);

    // Auto-refresh every 60s + countdown
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (cdRef.current) clearInterval(cdRef.current);
        timerRef.current = setInterval(() => load(ticker), 60_000);
        cdRef.current = setInterval(() => setCountdown(c => c <= 1 ? 60 : c - 1), 1000);
        return () => { clearInterval(timerRef.current!); clearInterval(cdRef.current!); };
    }, [ticker, load]);

    const handleSelect = (sym: string) => { setTicker(sym); };

    const maxPeerAbs = data
        ? Math.max(...data.peers.map(p => Math.max(Math.abs(p.d91), Math.abs(p.d28), Math.abs(p.d7))), 1)
        : 1;

    return (
        <div className="h-screen flex flex-col" style={{ background: '#000', color: '#E6E6E6', fontFamily: "'Roboto Mono', monospace" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700;900&display=swap');
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #282828; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #FF8C00; }
      `}</style>

            {/* ── Top Nav Bar ── */}
            <div className="shrink-0 px-4 py-3 border-b flex items-center gap-3 flex-wrap" style={{ background: '#050505', borderColor: '#1a1a1a' }}>
                <button onClick={() => navigate('/terminal')}
                    className="p-1.5 rounded hover:bg-white/10 transition-colors shrink-0" title="Back to Terminal">
                    <ChevronRight size={18} className="rotate-180" style={{ color: '#FF8C00' }} />
                </button>
                <div className="shrink-0">
                    <span className="text-base font-black font-mono" style={{ color: '#FF8C00' }}>ALT DATA</span>
                    <span className="text-xs ml-2 px-2 py-0.5 rounded font-bold border" style={{ color: '#FF8C00', borderColor: '#FF8C0055', background: 'rgba(255,140,0,0.08)' }}>CONSUMER INTELLIGENCE</span>
                </div>

                {/* Live search */}
                <SymbolSearchBar
                    onSelect={handleSelect}
                    currentTicker={ticker}
                    currentName={data?.company.name ?? ''}
                />

                {/* Refresh + timer */}
                <div className="flex items-center gap-2 ml-auto shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: '#444' }}>
                        <Clock size={11} />
                        <span>{lastRefresh ? lastRefresh.toLocaleTimeString() : '—'}</span>
                        <span style={{ color: '#282828' }}>·</span>
                        <span style={{ color: countdown < 10 ? '#FF8C00' : '#333' }}>next {countdown}s</span>
                    </div>
                    <button onClick={() => load(ticker)}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Refresh now">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} style={{ color: loading ? '#FF8C00' : '#555' }} />
                    </button>
                </div>
            </div>

            {/* ── Symbol Quick Picks ── */}
            <div className="shrink-0 border-b overflow-x-auto" style={{ background: '#030303', borderColor: '#111' }}>
                <div className="flex items-stretch min-w-max">
                    {PRESET_GROUPS.map((g, gi) => (
                        <div key={g.label} className="flex items-center border-r" style={{ borderColor: '#111' }}>
                            <button onClick={() => setActiveGroup(gi)}
                                className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest shrink-0 border-r transition-colors"
                                style={{ borderColor: '#111', color: activeGroup === gi ? '#FF8C00' : '#444', background: activeGroup === gi ? 'rgba(255,140,0,0.06)' : 'transparent' }}>
                                {g.label}
                            </button>
                            {g.tickers.map(t => (
                                <button key={t} onClick={() => handleSelect(t)}
                                    className="px-2.5 py-2 text-xs font-mono font-bold transition-colors whitespace-nowrap"
                                    style={{ color: t === ticker ? '#FF8C00' : '#555', background: t === ticker ? 'rgba(255,140,0,0.12)' : 'transparent', borderBottom: t === ticker ? '2px solid #FF8C00' : '2px solid transparent' }}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Company Hero ── */}
            <CompanyHero data={data} loading={loading && !data} />

            {/* ── Error ── */}
            {error && (
                <div className="mx-6 mt-3 px-4 py-2.5 rounded border flex items-center gap-2 text-sm shrink-0"
                    style={{ background: '#1a0000', borderColor: '#FF4040', color: '#FF4040' }}>
                    <AlertCircle size={14} />{error}
                    <button onClick={() => load(ticker)} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {/* ── Main Scrollable Content ── */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
                <div className="p-6 space-y-6">
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { l: 'Market Cap', v: data?.company.marketCap ? fmtB(data.company.marketCap) : '—', c: '#FF8C00', icon: <BarChart2 size={13} /> },
                            { l: 'Revenue (TTM)', v: data?.company.revenue ? fmtB(data.company.revenue) : '—', c: '#4488FF', icon: <TrendingUp size={13} /> },
                            { l: 'Rev Growth YoY', v: data?.company.revenueGrowth != null ? `${(data.company.revenueGrowth * 100).toFixed(1)}%` : '—', c: data?.company.revenueGrowth != null && data.company.revenueGrowth >= 0 ? '#00FF00' : '#FF4040', icon: <Activity size={13} /> },
                            { l: 'Est. Locations', v: data?.company.storeCount != null && data.company.storeCount > 1 ? data.company.storeCount.toLocaleString() : '—', c: '#a78bfa', icon: <Database size={13} /> },
                        ].map(k => (
                            <div key={k.l} className="p-4 rounded-lg border" style={{ background: '#090909', borderColor: '#282828' }}>
                                <div className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-widest" style={{ color: '#555' }}>
                                    {k.icon}{k.l}
                                </div>
                                {loading && !data ? <Sk h="h-6" /> : (
                                    <div className="text-xl font-black font-mono" style={{ color: k.c }}>{k.v}</div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Main Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* Left column */}
                        <div className="xl:col-span-2 space-y-6">
                            {/* Metrics Table */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1 h-4 rounded-full shrink-0" style={{ background: '#FF8C00' }} />
                                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#FF8C00' }}>Alternative Metrics — {ticker}</span>
                                    <span className="text-[10px] ml-auto" style={{ color: '#333' }}>📡 Yahoo Finance + FRED · Updated {lastRefresh?.toLocaleTimeString() ?? '…'}</span>
                                </div>
                                <MetricsTable metrics={data?.metrics ?? []} loading={loading && !data} />
                            </div>

                            {/* Competitor Table */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1 h-4 rounded-full shrink-0" style={{ background: '#4488FF' }} />
                                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4488FF' }}>Sector Peers — Sales Momentum</span>
                                </div>
                                <CompetitorTable peers={data?.peers ?? []} currentTicker={ticker} loading={loading && !data} />
                            </div>

                            {/* Heatmap */}
                            {data && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1 h-4 rounded-full shrink-0" style={{ background: '#00FF00' }} />
                                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#00FF00' }}>Momentum Heatmap</span>
                                        <span className="text-[10px] ml-auto" style={{ color: '#444' }}>91D · 28D · 7D signal strength</span>
                                    </div>
                                    <div className="rounded-lg border p-4 space-y-3" style={{ background: '#090909', borderColor: '#282828' }}>
                                        {data.metrics.map(m => {
                                            const max = maxPeerAbs * 2 || 1;
                                            const bar = (v: number) => {
                                                const pct = Math.min(100, Math.abs(v) / max * 100);
                                                const col = v > 0 ? '#00FF00' : v < 0 ? '#FF4040' : '#333';
                                                return (
                                                    <div className="flex-1 h-2 rounded-full" style={{ background: '#111' }}>
                                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col, opacity: 0.75 }} />
                                                    </div>
                                                );
                                            };
                                            return (
                                                <div key={m.name} className="flex items-center gap-3">
                                                    <span className="text-[11px] font-mono w-40 shrink-0 truncate" style={{ color: '#666' }}>
                                                        {m.name.replace('Observed ', '').replace('Estimated ', '')}
                                                    </span>
                                                    {bar(m.d91)}{bar(m.d28)}{bar(m.d7)}
                                                </div>
                                            );
                                        })}
                                        <div className="flex items-center gap-3 text-[10px] pt-1" style={{ color: '#333' }}>
                                            <span className="w-40 shrink-0"></span>
                                            <span className="flex-1">91-Day</span><span className="flex-1">28-Day</span><span className="flex-1">7-Day</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right column */}
                        <div className="space-y-5">
                            {/* Chart */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1 h-4 rounded-full shrink-0" style={{ background: '#FF8C00' }} />
                                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#FF8C00' }}>Price + Demand Signal · {ticker}</span>
                                </div>
                                <div className="rounded-lg border overflow-hidden" style={{ background: '#000', borderColor: '#282828', height: 220 }}>
                                    {loading && !data ? (
                                        <div className="h-full flex items-center justify-center gap-2">
                                            <Activity size={20} className="animate-pulse" style={{ color: '#FF8C00' }} />
                                            <span className="text-xs font-mono" style={{ color: '#555' }}>Loading {ticker}…</span>
                                        </div>
                                    ) : data?.chartData.length ? (
                                        <PriceChart data={data.chartData} />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-xs" style={{ color: '#333' }}>No chart data</div>
                                    )}
                                </div>
                                <div className="flex gap-4 mt-1.5 text-[10px]" style={{ color: '#444' }}>
                                    <span>── <span style={{ color: '#FF8C00' }}>Price (Yahoo Finance)</span></span>
                                    <span>── <span style={{ color: '#00FF00' }}>Consumer Demand Index</span></span>
                                </div>
                            </div>

                            {/* FRED Retail */}
                            {(data?.retailIndex?.length ?? 0) > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1 h-4 rounded-full shrink-0" style={{ background: '#4488FF' }} />
                                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4488FF' }}>FRED · US Retail Sales</span>
                                        <span className="text-[10px] ml-auto" style={{ color: '#333' }}>RSXFS · Seasonally Adj.</span>
                                    </div>
                                    <div className="rounded-lg border p-4" style={{ background: '#090909', borderColor: '#282828' }}>
                                        <Sparkline data={(data?.retailIndex ?? []).map(r => r.value)} color="#4488FF" />
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            {(data?.retailIndex ?? []).slice(-4).map(r => (
                                                <div key={r.date} className="text-xs">
                                                    <div style={{ color: '#555' }}>{r.date}</div>
                                                    <div className="font-mono font-bold" style={{ color: '#E6E6E6' }}>${r.value.toLocaleString()}B</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Data Sources */}
                            <div className="rounded-lg border p-4" style={{ background: '#050505', borderColor: '#1a1a1a' }}>
                                <div className="text-[10px] uppercase tracking-widest mb-3 font-bold" style={{ color: '#FF8C00' }}>📡 Live Data Sources</div>
                                {['Yahoo Finance (Price, Fundamentals, Revenue)', 'FRED RSXFS (US Retail Sales Index)', 'Sector Revenue Growth (Quarterly)', 'Price Momentum (Proxy for 7D Signal)'].map(s => (
                                    <div key={s} className="flex items-start gap-2 text-xs py-1.5 border-b" style={{ color: '#555', borderColor: '#0d0d0d' }}>
                                        <Database size={9} className="shrink-0 mt-0.5" />{s}
                                    </div>
                                ))}
                                <div className="mt-3 text-[10px]" style={{ color: '#333' }}>
                                    Note: Bloomberg Second Measure-style data requires institutional licenses. These metrics are computed as mathematical proxies from real public data — not dummy values.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
