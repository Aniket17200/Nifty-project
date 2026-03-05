import { useState } from 'react';
import { FileText, Clock, ChevronRight, Zap, BarChart2, Percent, ExternalLink, AlertCircle } from 'lucide-react';
import { Signal } from './types';

// ─── Primitives ───────────────────────────────────────────────────────────────
export function Sk({ cls }: { cls?: string }) {
    return <div className={`animate-pulse bg-slate-800 rounded ${cls ?? ''}`} />;
}

export function StatCard({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30 hover:border-orange-500/25 transition-all">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">{label}</div>
            <div className={`font-mono font-bold text-sm ${color || 'text-slate-200'}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
        </div>
    );
}

export function SignalBadge({ label, signal }: { label: string; signal: Signal }) {
    const map: Record<Signal, string> = {
        BUY: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
        SELL: 'text-rose-400 bg-rose-400/10 border-rose-500/30',
        NEUTRAL: 'text-slate-400 bg-slate-400/10 border-slate-500/30',
        OVERBOUGHT: 'text-amber-400 bg-amber-400/10 border-amber-500/30',
        OVERSOLD: 'text-cyan-400 bg-cyan-400/10 border-cyan-500/30',
    };
    return (
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold ${map[signal]}`}>
            <span className="text-slate-400 font-normal">{label}</span><span>{signal}</span>
        </div>
    );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
const fmtBig = (v: number) => v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : `$${v.toFixed(2)}`;

export function OverviewTab({ desData, chartSummary, target, loading }: { desData: any; chartSummary: any; target: any; loading: boolean }) {
    const d = desData || {};
    const s = chartSummary || {};
    const isUp = (target.changePercent ?? 0) >= 0;
    const score = isUp
        ? Math.min(92, 50 + Math.abs(target.changePercent ?? 0) * 8)
        : Math.max(8, 50 - Math.abs(target.changePercent ?? 0) * 8);
    const verdict = score >= 70 ? { t: 'Bullish', e: '🟢', c: 'text-emerald-400' }
        : score >= 56 ? { t: 'Mildly Bullish', e: '🟡', c: 'text-amber-400' }
            : score <= 30 ? { t: 'Bearish', e: '🔴', c: 'text-rose-400' }
                : score <= 44 ? { t: 'Mildly Bearish', e: '🟠', c: 'text-orange-400' }
                    : { t: 'Neutral', e: '⚪', c: 'text-slate-400' };

    const metrics = [
        ['Market Cap', d.marketCap ? fmtBig(d.marketCap) : '—'],
        ['P/E (TTM)', d.trailingPE?.toFixed(2) ?? '—'],
        ['Fwd P/E', d.forwardPE?.toFixed(2) ?? '—'],
        ['EPS', d.eps ? `$${d.eps.toFixed(2)}` : '—'],
        ['P/B', d.priceToBook?.toFixed(2) ?? '—'],
        ['Beta', d.beta?.toFixed(2) ?? '—'],
        ['Div Yield', d.dividendYield ? `${(d.dividendYield * 100).toFixed(2)}%` : '—'],
        ['52W High', d.fiftyTwoWeekHigh ? `$${d.fiftyTwoWeekHigh.toFixed(2)}` : '—'],
        ['52W Low', d.fiftyTwoWeekLow ? `$${d.fiftyTwoWeekLow.toFixed(2)}` : '—'],
        ['50D MA', d.fiftyDayAverage ? `$${d.fiftyDayAverage.toFixed(2)}` : s.dayHigh ? `$${s.dayHigh.toFixed(2)}` : '—'],
        ['200D MA', d.twoHundredDayAverage ? `$${d.twoHundredDayAverage.toFixed(2)}` : '—'],
        ['Revenue', d.revenue ? fmtBig(d.revenue) : '—'],
    ] as [string, string][];

    const snapshot = [
        ['Open', d.open ? `$${d.open.toFixed(2)}` : '—'],
        ['High', d.high || s.dayHigh ? `$${(d.high || s.dayHigh).toFixed(2)}` : '—'],
        ['Low', d.low || s.dayLow ? `$${(d.low || s.dayLow).toFixed(2)}` : '—'],
        ['Volume', (d.volume || target.volume) ? `${(((d.volume || target.volume) as number) / 1e6).toFixed(1)}M` : '—'],
    ] as [string, string][];

    if (loading) return <div className="space-y-5"><Sk cls="h-40" /><div className="grid grid-cols-4 gap-2">{Array(12).fill(0).map((_, i) => <Sk key={i} cls="h-14" />)}</div></div>;

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
                {/* Verdict */}
                <div className="col-span-2 bg-gradient-to-br from-slate-900 to-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4"><Zap size={12} className="text-orange-400" /><span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Quick Verdict</span></div>
                    <div className="flex items-end gap-4 mb-4">
                        <div><span className={`text-5xl font-black ${verdict.c}`}>{score.toFixed(0)}</span><span className="text-xl text-slate-700">/100</span></div>
                        <div className="mb-1"><div className={`text-lg font-bold ${verdict.c}`}>{verdict.e} {verdict.t}</div><div className="text-xs text-slate-500 mt-0.5">Trend: {s.trend || '—'}</div></div>
                    </div>
                    <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${score}%`, background: score >= 60 ? '#10b981' : score <= 40 ? '#f43f5e' : '#f59e0b' }} />
                    </div>
                    {d.description && <p className="text-[11px] text-slate-400 leading-relaxed border-l-2 border-orange-500/30 pl-3 line-clamp-4">{d.description}</p>}
                    {d.website && <a href={d.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-orange-400 hover:underline mt-3"><ExternalLink size={11} />{d.website}</a>}
                </div>
                {/* Snapshot */}
                <div className="space-y-2">{snapshot.map(([l, v]) => <StatCard key={l} label={l} value={v} />)}</div>
            </div>

            {/* Key Metrics */}
            <div>
                <div className="flex items-center gap-2 mb-2.5"><BarChart2 size={12} className="text-slate-500" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Key Metrics</span></div>
                <div className="grid grid-cols-4 gap-2">{metrics.map(([l, v]) => <StatCard key={l} label={l} value={v} />)}</div>
            </div>

            {/* Margins */}
            {(d.grossMargin || d.operatingMargin || d.netMargin) && (
                <div>
                    <div className="flex items-center gap-2 mb-2.5"><Percent size={12} className="text-slate-500" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Profitability</span></div>
                    <div className="grid grid-cols-3 gap-3">
                        {[{ l: 'Gross Margin', v: d.grossMargin, c: 'text-emerald-400', bg: '#10b981' }, { l: 'Op. Margin', v: d.operatingMargin, c: 'text-blue-400', bg: '#60a5fa' }, { l: 'Net Margin', v: d.netMargin, c: 'text-violet-400', bg: '#a78bfa' }]
                            .filter(m => m.v != null).map(m => (
                                <div key={m.l} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{m.l}</div>
                                    <div className={`font-mono font-black text-xl ${m.c}`}>{(m.v * 100).toFixed(1)}%</div>
                                    <div className="mt-2.5 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, m.v * 100))}%`, background: m.bg }} /></div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
            {!d.price && !loading && (
                <div className="text-center py-4 text-slate-600 text-xs flex items-center justify-center gap-2">
                    <AlertCircle size={14} />Company data may be delayed or unavailable for this symbol.
                </div>
            )}
        </div>
    );
}

// ─── Technical Tab ────────────────────────────────────────────────────────────
export function TechnicalTab({ chartSummary, desData, loading }: { chartSummary: any; desData: any; loading: boolean }) {
    const s = chartSummary || {};
    const d = desData || {};
    const rsi: number = s.rsi ?? 50;
    const macd = s.macd || { macd: 0, signal: 0, histogram: 0 };
    const trend: string = s.trend || '—';

    const rsiSig: Signal = rsi > 70 ? 'OVERBOUGHT' : rsi < 30 ? 'OVERSOLD' : rsi > 55 ? 'BUY' : rsi < 45 ? 'SELL' : 'NEUTRAL';
    const macdSig: Signal = macd.histogram > 0 ? 'BUY' : macd.histogram < 0 ? 'SELL' : 'NEUTRAL';
    const trendSig: Signal = trend.includes('Up') ? 'BUY' : trend.includes('Down') ? 'SELL' : 'NEUTRAL';
    const all = [rsiSig, macdSig, trendSig];
    const buys = all.filter(x => x === 'BUY' || x === 'OVERSOLD').length;
    const sells = all.filter(x => x === 'SELL' || x === 'OVERBOUGHT').length;
    const cs: Signal = buys > sells ? 'BUY' : sells > buys ? 'SELL' : 'NEUTRAL';

    if (loading) return <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Sk key={i} cls="h-24" />)}</div>;

    return (
        <div className="space-y-5">
            <div className={`rounded-2xl p-5 border flex items-center justify-between ${cs === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/30' : cs === 'SELL' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-800/40 border-slate-700'}`}>
                <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Technical Consensus</div>
                    <div className={`text-4xl font-black ${cs === 'BUY' ? 'text-emerald-400' : cs === 'SELL' ? 'text-rose-400' : 'text-slate-300'}`}>{cs === 'BUY' ? '🟢 BUY' : cs === 'SELL' ? '🔴 SELL' : '⚪ NEUTRAL'}</div>
                </div>
                <div className="text-sm text-right">
                    <span className="text-emerald-400 font-bold">{buys} BUY</span> · <span className="text-rose-400 font-bold">{sells} SELL</span> · <span className="text-slate-400 font-bold">{3 - buys - sells} NEUTRAL</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {/* RSI */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex justify-between mb-3"><span className="text-xs font-bold text-slate-400 uppercase">RSI (14)</span><span className={`font-mono font-black text-lg ${rsi > 70 ? 'text-amber-400' : rsi < 30 ? 'text-cyan-400' : rsi > 55 ? 'text-emerald-400' : 'text-rose-400'}`}>{rsi.toFixed(1)}</span></div>
                    <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right,#06b6d4 0%,#06b6d4 30%,#10b981 30%,#10b981 70%,#f59e0b 70%)' }} />
                        <div className="absolute top-0 h-full w-1.5 bg-white rounded-full" style={{ left: `${Math.min(98, Math.max(1, rsi))}%`, transform: 'translateX(-50%)' }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600 mb-3"><span>30</span><span>Neutral</span><span>70</span></div>
                    <SignalBadge label="RSI" signal={rsiSig} />
                </div>
                {/* MACD */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-3">MACD (12,26,9)</div>
                    <div className="space-y-2 mb-3">
                        {([['MACD', macd.macd, 'text-blue-400'], ['Signal', macd.signal, 'text-orange-400'], ['Histogram', macd.histogram, macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400']] as [string, number, string][]).map(([l, v, c]) => (
                            <div key={l} className="flex justify-between items-center"><span className="text-[11px] text-slate-500">{l}</span><span className={`font-mono font-bold text-sm ${c}`}>{Number(v).toFixed(4)}</span></div>
                        ))}
                    </div>
                    <SignalBadge label="MACD" signal={macdSig} />
                </div>
                {/* Trend */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Trend</div>
                    <div className={`text-xl font-black mb-1 ${trend.includes('Up') ? 'text-emerald-400' : trend.includes('Down') ? 'text-rose-400' : 'text-slate-400'}`}>{trend}</div>
                    <div className="text-[10px] text-slate-600 mb-3">SMA 20/50/200 alignment</div>
                    <SignalBadge label="Trend" signal={trendSig} />
                </div>
                {/* Moving Averages */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-3">Moving Averages</div>
                    <div className="space-y-2">
                        {[['50D MA', d.fiftyDayAverage, 'text-orange-400'], ['200D MA', d.twoHundredDayAverage, 'text-violet-400'], ['Day High', s.dayHigh, 'text-emerald-400'], ['Day Low', s.dayLow, 'text-rose-400'], ['Prev Close', d.previousClose, 'text-slate-400']].map(([l, v, c]: any[]) => (
                            <div key={l} className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">{l}</span>
                                <span className={`font-mono font-bold ${c}`}>{v ? `$${Number(v).toFixed(2)}` : '—'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Financials Tab ───────────────────────────────────────────────────────────
export function FinancialsTab({ desData, faData, loading }: { desData: any; faData: any; loading: boolean }) {
    const d = desData || {};
    const [sec, setSec] = useState<'income' | 'balance' | 'cashflow'>('income');
    const fa = faData?.incomeStatements?.slice(0, 5).reverse() || [];
    const bs = faData?.balanceSheets?.slice(0, 5).reverse() || [];
    const cf = faData?.cashFlowStatements?.slice(0, 5).reverse() || [];
    const rows = sec === 'income' ? fa : sec === 'balance' ? bs : cf;
    const fmt = (v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : `$${v.toFixed(0)}`;
    const keys: Record<string, [string, string][]> = {
        income: [['Revenue', 'revenue'], ['Gross Profit', 'grossProfit'], ['Operating Inc.', 'operatingIncome'], ['Net Income', 'netIncome'], ['EBITDA', 'ebitda'], ['EPS', 'epsBasic']],
        balance: [['Total Assets', 'totalAssets'], ['Total Liabilities', 'totalLiabilities'], ['Equity', 'totalEquity'], ['Cash', 'cashAndEquivalents'], ['Total Debt', 'totalDebt'], ['Current Assets', 'currentAssets']],
        cashflow: [['Operating CF', 'operatingCashFlow'], ['Investing CF', 'investingCashFlow'], ['Financing CF', 'financingCashFlow'], ['Free Cash Flow', 'freeCashFlow'], ['CapEx', 'capitalExpenditure']],
    };
    if (loading) return <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Sk key={i} cls="h-20" />)}</div>;
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2.5">
                {[{ l: 'Revenue (TTM)', v: d.revenue ? fmt(d.revenue) : '—', c: 'text-blue-400' }, { l: 'ROE', v: d.returnOnEquity ? `${(d.returnOnEquity * 100).toFixed(1)}%` : '—', c: 'text-emerald-400' }, { l: 'D/E', v: d.debtToEquity?.toFixed(2) ?? '—', c: 'text-amber-400' }, { l: 'Current Ratio', v: d.currentRatio?.toFixed(2) ?? '—', c: 'text-cyan-400' }, { l: 'Gross Margin', v: d.grossMargin ? `${(d.grossMargin * 100).toFixed(1)}%` : '—', c: 'text-violet-400' }, { l: 'Net Margin', v: d.netMargin ? `${(d.netMargin * 100).toFixed(1)}%` : '—', c: 'text-rose-400' }].map(m => <StatCard key={m.l} label={m.l} value={m.v} color={m.c} />)}
            </div>
            {faData ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="flex border-b border-slate-800">
                        {(['income', 'balance', 'cashflow'] as const).map(s => (
                            <button key={s} onClick={() => setSec(s)} className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 ${sec === s ? 'border-orange-500 text-orange-400 bg-orange-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                                {s === 'income' ? 'Income' : s === 'balance' ? 'Balance Sheet' : 'Cash Flow'}
                            </button>
                        ))}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead><tr className="border-b border-slate-800/80">
                                <th className="text-left px-4 py-2.5 text-slate-500 w-40 bg-slate-900/40">Metric</th>
                                {rows.map((y: any) => <th key={y.year} className="text-right px-4 py-2.5 text-slate-400 font-mono bg-slate-900/40">{y.year}</th>)}
                            </tr></thead>
                            <tbody>
                                {(keys[sec] || []).map(([label, key]) => (
                                    <tr key={key} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                                        <td className="px-4 py-2 text-slate-400">{label}</td>
                                        {rows.map((y: any) => { const v: number | undefined = y[key]?.value; return (<td key={y.year} className={`text-right px-4 py-2 font-mono ${v !== undefined && v < 0 ? 'text-rose-400' : 'text-slate-300'}`}>{v !== undefined ? (key === 'epsBasic' ? `$${v.toFixed(2)}` : fmt(v)) : '—'}</td>); })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-10 text-slate-600"><FileText size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm">Historical financials not available.</p></div>
            )}
        </div>
    );
}

// ─── News Tab ─────────────────────────────────────────────────────────────────
export function NewsTab({ news, symbol, loading }: { news: any[]; symbol: string; loading: boolean }) {
    const age = (ts: string) => { const d = Date.now() - new Date(ts).getTime(), m = Math.floor(d / 60000), h = Math.floor(m / 60), day = Math.floor(h / 24); return day > 0 ? `${day}d` : h > 0 ? `${h}h` : `${m}m`; };
    const catC: Record<string, string> = { Macro: 'text-blue-400', Technology: 'text-violet-400', Earnings: 'text-emerald-400', 'M&A': 'text-amber-400', Regulatory: 'text-rose-400', Commodities: 'text-orange-400' };
    if (loading) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Sk key={i} cls="h-20" />)}</div>;
    return (
        <div className="space-y-2.5">
            {news.length > 0 ? news.map((n: any, i: number) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-orange-500/20 transition-all cursor-pointer group">
                    <div className="flex items-start gap-3">
                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.sentiment === 'positive' ? 'bg-emerald-400' : n.sentiment === 'negative' ? 'bg-rose-400' : 'bg-slate-600'}`} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                {n.impact === 'High' && <span className="text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded uppercase">High Impact</span>}
                                {n.category && <span className={`text-[9px] font-bold uppercase ${catC[n.category] || 'text-slate-400'}`}>{n.category}</span>}
                            </div>
                            <div className="text-sm font-semibold text-slate-200 mb-1 leading-snug group-hover:text-white transition-colors">{n.headline}</div>
                            {n.summary && <p className="text-[11px] text-slate-500 line-clamp-2 mb-2">{n.summary}</p>}
                            <div className="flex items-center gap-2 text-[10px] text-slate-600">
                                <span className="font-bold text-slate-500">{n.source}</span><span>·</span>
                                <Clock size={9} className="inline" />{age(n.publishedAt)} ago
                                {n.tickers?.slice(0, 3).map((t: string) => <span key={t} className="text-orange-400 font-mono">{t}</span>)}
                            </div>
                        </div>
                        <ChevronRight size={13} className="text-slate-700 group-hover:text-orange-400 transition-colors mt-1 shrink-0" />
                    </div>
                </div>
            )) : (
                <div className="text-center py-16 text-slate-600">
                    <FileText size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No news for <span className="font-mono">{symbol}</span></p>
                    <p className="text-xs mt-1">Showing general market news</p>
                </div>
            )}
        </div>
    );
}
