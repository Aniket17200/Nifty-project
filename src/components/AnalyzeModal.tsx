import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    X, TrendingUp, TrendingDown, RefreshCw,
    BarChart2, FileText, Activity, Zap, ExternalLink,
} from 'lucide-react';
import { TVChart } from './analyze/TVChart';
import { SymbolSearch } from './analyze/SymbolSearch';
import { OverviewTab, TechnicalTab, FinancialsTab, NewsTab } from './analyze/Tabs';
import { CRYPTO_SYMBOLS } from './analyze/types';

// ─── Re-export so Terminal.tsx import stays unchanged ─────────────────────────
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

interface Props {
    target: AnalyzeTarget | null;
    onClose: () => void;
    onRunCommand?: (cmd: string) => void;
}

const TABS = ['Overview', 'Chart', 'Financials', 'Technical', 'News'] as const;
type Tab = typeof TABS[number];

const TAB_ICONS: Record<Tab, React.ReactNode> = {
    Overview: <Activity size={11} />,
    Chart: <BarChart2 size={11} />,
    Financials: <FileText size={11} />,
    Technical: <TrendingUp size={11} />,
    News: <Zap size={11} />,
};

const AnalyzeModal: React.FC<Props> = ({ target: initTarget, onClose, onRunCommand }) => {
    // Allow user to switch symbol inside the modal
    const [sym, setSym] = useState(initTarget?.symbol ?? '');
    const [name, setName] = useState(initTarget?.name ?? '');

    const [tab, setTab] = useState<Tab>('Overview');
    const [desData, setDesData] = useState<any>(null);
    const [faData, setFaData] = useState<any>(null);
    const [chartSummary, setChartSummary] = useState<any>(null);
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [livePrice, setLivePrice] = useState<{ price: number; change: number; changePercent: number } | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Sync when parent changes target
    useEffect(() => {
        if (!initTarget) return;
        setSym(initTarget.symbol);
        setName(initTarget.name);
    }, [initTarget?.symbol]);

    // Fetch all data when symbol changes
    const fetchAll = useCallback(async (s: string) => {
        if (!s) return;
        setLoading(true);
        setDesData(null); setFaData(null); setNews([]); setLivePrice(null);
        try {
            const [des, newsRes] = await Promise.allSettled([
                fetch(`/api/des-company?symbol=${s}`).then(r => r.ok ? r.json() : null),
                fetch(`/api/news-firehose?limit=15&ticker=${s}`).then(r => r.ok ? r.json() : null),
            ]);
            if (des.status === 'fulfilled' && des.value) {
                setDesData(des.value);
                setLivePrice({ price: des.value.price, change: des.value.change, changePercent: des.value.changePercent });
            }
            if (newsRes.status === 'fulfilled' && newsRes.value) setNews((newsRes.value as any).items || []);
            // FA in background
            fetch(`/api/fa-financials?symbol=${s}&years=5`).then(r => r.ok ? r.json() : null).then(f => setFaData(f)).catch(() => { });
        } catch { /* silent */ }
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(sym); }, [sym, fetchAll]);

    // Live price refresh every 30s
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(async () => {
            try {
                const r = await fetch(`/api/des-company?symbol=${sym}`);
                if (r.ok) {
                    const d = await r.json();
                    setLivePrice({ price: d.price, change: d.change, changePercent: d.changePercent });
                }
            } catch { /* silent */ }
        }, 30_000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [sym]);

    if (!initTarget) return null;

    const isCrypto = !!CRYPTO_SYMBOLS[sym] || sym.endsWith('-USD') || sym.endsWith('-USDT');
    const price = livePrice?.price ?? initTarget.price ?? 0;
    const changePct = livePrice?.changePercent ?? initTarget.changePercent ?? 0;
    const changeAbs = livePrice?.change ?? initTarget.change ?? 0;
    const isUp = changePct >= 0;

    const handleSymbolChange = (s: string, n: string) => {
        setSym(s); setName(n); setTab('Overview');
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1e 100%)',
                    border: '1px solid rgba(249,115,22,0.2)',
                    boxShadow: '0 0 0 1px rgba(249,115,22,0.08), 0 32px 80px rgba(0,0,0,0.8)',
                }}
            >
                {/* ── Header ── */}
                <div className="shrink-0 px-6 py-4 border-b border-slate-800/80 flex items-center justify-between gap-4"
                    style={{ background: 'linear-gradient(to right, #0d1117, #0a0f1e)' }}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black text-base text-orange-400"
                            style={{ background: 'linear-gradient(135deg,rgba(249,115,22,0.2),rgba(245,158,11,0.15))', border: '1px solid rgba(249,115,22,0.3)' }}>
                            {isCrypto ? '₿' : sym.slice(0, 2)}
                        </div>

                        {/* Symbol + name */}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg font-black font-mono text-white tracking-tight">{sym}</h2>
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${isCrypto ? 'bg-violet-500/15 text-violet-400 border-violet-500/30' :
                                        initTarget.type === 'index' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                                            'bg-orange-500/15 text-orange-400 border-orange-500/30'
                                    }`}>
                                    {isCrypto ? 'CRYPTO' : initTarget.type === 'index' ? 'INDEX' : 'EQUITY'}
                                </span>
                                {desData?.sector && <span className="text-[10px] bg-slate-800 border border-slate-700 rounded-md px-2 py-0.5 text-slate-500">{desData.sector}</span>}
                                {loading && <RefreshCw size={11} className="text-orange-400 animate-spin" />}
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{name || desData?.name || initTarget.name}</p>
                        </div>

                        {/* Symbol search */}
                        <div className="ml-2">
                            <SymbolSearch onSelect={handleSymbolChange} current={sym} />
                        </div>
                    </div>

                    {/* Live Price */}
                    <div className="flex items-start gap-4 shrink-0">
                        <div className="text-right">
                            <div className="text-3xl font-black font-mono text-white leading-none">
                                {price > 0 ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                            </div>
                            <div className={`flex items-center justify-end gap-1 mt-1.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                <span className="font-mono font-bold text-sm">
                                    {isUp ? '+' : ''}{changeAbs.toFixed(2)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
                                </span>
                            </div>
                            <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] text-slate-600">Live · 30s refresh</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors mt-0.5">
                            <X size={18} className="text-slate-500 hover:text-slate-300" />
                        </button>
                    </div>
                </div>

                {/* ── Tab Bar ── */}
                <div className="shrink-0 flex items-center gap-1 px-5 py-2 border-b border-slate-800/60 bg-slate-900/30">
                    {TABS.map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === t
                                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40'
                                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60'
                                }`}>
                            {TAB_ICONS[t]}{t}
                        </button>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => fetchAll(sym)}
                            className="flex items-center gap-1 px-3 py-1.5 text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 rounded-lg transition-all">
                            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                        </button>
                    </div>
                </div>

                {/* ── Content ── */}
                <div className={`flex-1 min-h-0 ${tab === 'Chart' ? '' : 'overflow-y-auto'}`}>
                    {tab === 'Overview' && (
                        <div className="p-6">
                            <OverviewTab
                                desData={desData}
                                chartSummary={chartSummary}
                                target={{ ...initTarget, symbol: sym, changePercent: changePct, change: changeAbs, price, volume: initTarget.volume }}
                                loading={loading}
                            />
                        </div>
                    )}
                    {tab === 'Chart' && (
                        <TVChart symbol={sym} onSummary={setChartSummary} />
                    )}
                    {tab === 'Financials' && (
                        <div className="p-6">
                            <FinancialsTab desData={desData} faData={faData} loading={loading} />
                        </div>
                    )}
                    {tab === 'Technical' && (
                        <div className="p-6">
                            <TechnicalTab chartSummary={chartSummary} desData={desData} loading={loading} />
                        </div>
                    )}
                    {tab === 'News' && (
                        <div className="p-6">
                            <NewsTab news={news} symbol={sym} loading={loading} />
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="shrink-0 border-t border-slate-800/60 px-5 py-2.5 flex items-center justify-between bg-slate-900/30">
                    <div className="flex gap-1.5">
                        {onRunCommand && (
                            <>
                                <button onClick={() => { onRunCommand(`GP ${sym}`); onClose(); }}
                                    className="px-3 py-1.5 text-[11px] bg-orange-600/15 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 rounded-lg font-mono font-bold transition-all">
                                    GP Chart
                                </button>
                                <button onClick={() => { onRunCommand(`DES ${sym}`); onClose(); }}
                                    className="px-3 py-1.5 text-[11px] bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 rounded-lg font-mono transition-all">
                                    DES
                                </button>
                                <button onClick={() => { onRunCommand(`FA ${sym}`); onClose(); }}
                                    className="px-3 py-1.5 text-[11px] bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 rounded-lg font-mono transition-all">
                                    FA
                                </button>
                            </>
                        )}
                    </div>
                    <a href={`https://finance.yahoo.com/quote/${sym}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-orange-400 transition-colors">
                        <ExternalLink size={10} /> Yahoo Finance
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AnalyzeModal;
