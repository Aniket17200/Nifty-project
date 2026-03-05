import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';
import { Activity, AlertCircle } from 'lucide-react';
import { INTERVAL_RANGE } from './types';

const INTERVALS = ['1m', '5m', '15m', '30m', '1h', '1d', '1wk'] as const;
type Interval = typeof INTERVALS[number];

interface TVChartProps {
    symbol: string;
    onSummary?: (s: any) => void;
}

export function TVChart({ symbol, onSummary }: TVChartProps) {
    const el = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const [interval, setInterval] = useState<Interval>('1d');
    const [chartType, setChartType] = useState<'candle' | 'area'>('candle');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [ohlc, setOhlc] = useState<string>('');
    const [lastPrice, setLastPrice] = useState<{ v: string; up: boolean } | null>(null);

    const load = useCallback(async (iv: Interval) => {
        if (!el.current) return;
        setLoading(true); setError('');
        try {
            const range = INTERVAL_RANGE[iv] || '6mo';
            const res = await fetch(`/api/gp-charts?symbol=${symbol}&interval=${iv}&range=${range}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const pd: any[] = data.priceData || [];
            if (!pd.length) throw new Error('No data returned');
            onSummary?.(data.summary);

            // Clear old chart
            if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

            const chart = createChart(el.current!, {
                layout: { background: { type: ColorType.Solid, color: '#090e1a' }, textColor: '#64748b', fontFamily: 'monospace' },
                grid: { vertLines: { color: '#1e293b', style: LineStyle.Dashed }, horzLines: { color: '#1e293b', style: LineStyle.Dashed } },
                crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#f97316', labelBackgroundColor: '#f97316' }, horzLine: { color: '#f97316', labelBackgroundColor: '#f97316' } },
                rightPriceScale: { borderColor: '#1e293b' },
                timeScale: { borderColor: '#1e293b', timeVisible: true, secondsVisible: iv === '1m' },
                width: el.current!.clientWidth,
                height: el.current!.clientHeight,
            });
            chartRef.current = chart;

            let mainSeries: any;
            if (chartType === 'candle') {
                mainSeries = chart.addCandlestickSeries({ upColor: '#10b981', downColor: '#f43f5e', borderUpColor: '#10b981', borderDownColor: '#f43f5e', wickUpColor: '#10b981', wickDownColor: '#f43f5e' });
                mainSeries.setData(pd.map((d: any) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close })));

                const volS = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol', color: '#26a69a' });
                chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 }, borderVisible: false });
                volS.setData(pd.map((d: any) => ({ time: d.time, value: d.volume, color: d.close >= d.open ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)' })));
            } else {
                mainSeries = chart.addAreaSeries({ lineColor: '#f97316', topColor: 'rgba(249,115,22,0.2)', bottomColor: 'rgba(249,115,22,0)', lineWidth: 2 });
                mainSeries.setData(pd.map((d: any) => ({ time: d.time, value: d.close })));
            }

            // SMA overlays (only on daily/weekly)
            if (iv === '1d' || iv === '1wk') {
                const closes = pd.map((d: any) => d.close);
                const sma = (n: number) => closes.map((_: any, i: number) =>
                    i < n - 1 ? null : closes.slice(i - n + 1, i + 1).reduce((a: number, b: number) => a + b, 0) / n
                );
                const s20 = sma(20), s50 = sma(50), s200 = sma(200);
                const mkLine = (c: string, t: string) => chart.addLineSeries({ color: c, lineWidth: 1, title: t, priceLineVisible: false, lastValueVisible: false });
                const l20 = mkLine('#fb923c', 'SMA20'), l50 = mkLine('#a78bfa', 'SMA50'), l200 = mkLine('#2dd4bf', 'SMA200');
                l20.setData(pd.filter((_: any, i: number) => s20[i] !== null).map((d: any) => ({ time: d.time, value: s20[pd.indexOf(d)] as number })));
                l50.setData(pd.filter((_: any, i: number) => s50[i] !== null).map((d: any) => ({ time: d.time, value: s50[pd.indexOf(d)] as number })));
                l200.setData(pd.filter((_: any, i: number) => s200[i] !== null).map((d: any) => ({ time: d.time, value: s200[pd.indexOf(d)] as number })));
            }

            chart.subscribeCrosshairMove((p: any) => {
                const d = p.seriesData?.get(mainSeries);
                if (d) {
                    const isCandle = 'open' in d;
                    if (isCandle) setOhlc(`O:${d.open.toFixed(2)} H:${d.high.toFixed(2)} L:${d.low.toFixed(2)} C:${d.close.toFixed(2)}`);
                    else setOhlc(`Price: ${d.value?.toFixed(2)}`);
                }
            });

            chart.timeScale().fitContent();
            const last = pd[pd.length - 1];
            const prev = pd[pd.length - 2];
            if (last) setLastPrice({ v: last.close.toFixed(2), up: last.close >= (prev?.close ?? last.open) });
        } catch (e: any) { setError(e.message); }
        setLoading(false);
    }, [symbol, chartType, onSummary]);

    useEffect(() => { load(interval); }, [interval, load]);

    useEffect(() => {
        if (!el.current || !chartRef.current) return;
        const ro = new ResizeObserver(() => chartRef.current?.applyOptions({ width: el.current!.clientWidth }));
        ro.observe(el.current);
        return () => ro.disconnect();
    }, [loading]);

    useEffect(() => () => { chartRef.current?.remove(); }, []);

    return (
        <div className="flex flex-col h-full bg-[#090e1a]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/60 shrink-0 flex-wrap gap-2">
                <div className="flex gap-1">
                    {INTERVALS.map(i => (
                        <button key={i} onClick={() => setInterval(i)}
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded transition-all ${interval === i ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                            {i.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setChartType(t => t === 'candle' ? 'area' : 'candle')}
                        className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all">
                        {chartType === 'candle' ? '🕯 Candle' : '📈 Area'}
                    </button>
                    <div className="flex gap-2 text-[10px] text-slate-600">
                        <span><span className="text-orange-400">─</span> SMA20</span>
                        <span><span className="text-violet-400">─</span> SMA50</span>
                        <span><span className="text-teal-400">─</span> SMA200</span>
                    </div>
                </div>
            </div>

            {/* OHLC Bar */}
            {(lastPrice || ohlc) && !loading && (
                <div className="px-4 py-1.5 bg-slate-900/50 border-b border-slate-800/40 flex items-center gap-3 shrink-0">
                    {lastPrice && <span className={`font-mono font-black text-base ${lastPrice.up ? 'text-emerald-400' : 'text-rose-400'}`}>${lastPrice.v}</span>}
                    {ohlc && <span className="text-[10px] font-mono text-slate-500">{ohlc}</span>}
                </div>
            )}

            {/* Chart */}
            <div className="relative flex-1 min-h-0">
                {loading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090e1a] gap-3">
                        <Activity size={32} className="text-orange-500 animate-pulse" />
                        <span className="text-xs text-slate-500 font-mono">Loading {symbol} · {interval.toUpperCase()}…</span>
                        <div className="flex gap-1">{[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
                    </div>
                )}
                {error && !loading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3">
                        <AlertCircle size={28} className="text-rose-500" />
                        <p className="text-sm text-slate-400">{error}</p>
                        <button onClick={() => load(interval)} className="px-4 py-2 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-500">Retry</button>
                    </div>
                )}
                <div ref={el} className="w-full h-full" />
            </div>
        </div>
    );
}
