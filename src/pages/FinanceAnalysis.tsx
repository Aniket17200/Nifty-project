import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// PPLX_KEY removed — API call goes through server-side proxy at /api/finance-analysis to avoid CORS

const QUICK_PICKS = [
    { symbol: 'NIFTY', label: 'Nifty 50', flag: '🇮🇳', color: '#f59e0b' },
    { symbol: 'SENSEX', label: 'Sensex', flag: '🇮🇳', color: '#ef4444' },
    { symbol: 'RELIANCE.NS', label: 'Reliance', flag: '🇮🇳', color: '#8b5cf6' },
    { symbol: 'TCS.NS', label: 'TCS', flag: '🇮🇳', color: '#06b6d4' },
    { symbol: 'INFY.NS', label: 'Infosys', flag: '🇮🇳', color: '#10b981' },
    { symbol: 'HDFCBANK.NS', label: 'HDFC Bank', flag: '🇮🇳', color: '#3b82f6' },
    { symbol: 'AAPL', label: 'Apple', flag: '🇺🇸', color: '#94a3b8' },
    { symbol: 'NVDA', label: 'NVIDIA', flag: '🇺🇸', color: '#4ade80' },
    { symbol: 'TSLA', label: 'Tesla', flag: '🇺🇸', color: '#fbbf24' },
    { symbol: 'MSFT', label: 'Microsoft', flag: '🇺🇸', color: '#60a5fa' },
    { symbol: 'BTC-USD', label: 'Bitcoin', flag: '🪙', color: '#f97316' },
    { symbol: 'GOLD', label: 'Gold', flag: '🥇', color: '#fcd34d' },
];

const SECTION_META: Record<string, { icon: string; color: string }> = {
    'Company Overview': { icon: '🏢', color: '#60a5fa' },
    'Current Price': { icon: '💰', color: '#4ade80' },
    'Financial Performance': { icon: '📊', color: '#a78bfa' },
    'Technical Analysis': { icon: '📈', color: '#34d399' },
    'Bull Case': { icon: '🐂', color: '#4ade80' },
    'Bear Case': { icon: '🐻', color: '#f87171' },
    'Analyst Consensus': { icon: '🎯', color: '#fbbf24' },
    'AI Investment Verdict': { icon: '🤖', color: '#c084fc' },
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface QuickSummary {
    price: string;
    change: string;
    verdict: string;
    verdictColor: string;
    target: string;
    risk: string;
    oneliner: string;
}

interface Section {
    title: string;
    content: string;
    icon: string;
    color: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function extractQuickSummary(text: string, ticker: string): QuickSummary {
    const lower = text.toLowerCase();
    let verdict = 'HOLD';
    let verdictColor = '#fbbf24';
    if (lower.includes('strong buy')) { verdict = 'STRONG BUY'; verdictColor = '#22d3ee'; }
    else if (lower.includes('buy')) { verdict = 'BUY'; verdictColor = '#4ade80'; }
    else if (lower.includes('strong sell')) { verdict = 'STRONG SELL'; verdictColor = '#ef4444'; }
    else if (lower.includes('sell')) { verdict = 'SELL'; verdictColor = '#f87171'; }

    const priceMatch = text.match(/\$[\d,]+\.?\d*/);
    const targetMatch = text.match(/target[^$\d]*\$?([\d,]+\.?\d*)/i);
    const riskMatch = text.match(/risk[^:]*:\s*(low|medium|high|very high)/i);

    const oneliner =
        text.split('\n').find(l => l.length > 60 && l.length < 200 && !l.startsWith('#') && !l.startsWith('-')) ??
        `${ticker} is currently under AI analysis — see sections below for details.`;

    return {
        price: priceMatch ? priceMatch[0] : '—',
        change: '—',
        verdict,
        verdictColor,
        target: targetMatch ? `$${targetMatch[1]}` : '—',
        risk: riskMatch ? (riskMatch[1] ?? 'Medium') : 'Medium',
        oneliner: oneliner.replace(/\*\*/g, '').slice(0, 180),
    };
}

function parseSections(raw: string): Section[] {
    const parts = raw.split(/^## \d+\.\s*/m).filter(Boolean);
    return parts.map(part => {
        const lines = part.trim().split('\n');
        const title = (lines[0] ?? '').replace(/^#+\s*/, '').replace(/🐂|🐻|🤖|📈|💰|📊|🏢|🎯/g, '').trim();
        const content = lines.slice(1).join('\n').trim();
        const key = Object.keys(SECTION_META).find(k => title.includes(k)) ?? '';
        return {
            title,
            content,
            icon: SECTION_META[key]?.icon ?? '📋',
            color: SECTION_META[key]?.color ?? '#94a3b8',
        };
    });
}

function renderContent(text: string): React.ReactNode[] {
    return text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
        if (line.startsWith('### '))
            return <h4 key={i} style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700, margin: '14px 0 6px' }}>{line.slice(4)}</h4>;
        if (/^\*\*(.+)\*\*$/.test(line))
            return <p key={i} style={{ color: '#cbd5e1', fontWeight: 700, fontSize: 13, margin: '8px 0 2px' }}>{line.replace(/\*\*/g, '')}</p>;
        if (line.startsWith('- ') || line.startsWith('• '))
            return (
                <div key={i} style={{ display: 'flex', gap: 8, margin: '4px 0' }}>
                    <span style={{ color: '#4ade80', marginTop: 1, flexShrink: 0 }}>▸</span>
                    <span style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.65 }}>{line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}</span>
                </div>
            );
        return <p key={i} style={{ color: '#94a3b8', fontSize: 13, margin: '3px 0', lineHeight: 1.65 }}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
    });
}

// ─── Mini bar chart ──────────────────────────────────────────────────────────
function SparkBar({ pct, color }: { pct: number; color: string }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden', flex: 1 }}>
            <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
        </div>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────
const FinanceAnalysis: React.FC = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [query, setQuery] = useState(params.get('q') ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [summary, setSummary] = useState<QuickSummary | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [active, setActive] = useState(0);
    const [citations, setCitations] = useState<string[]>([]);
    const [ticker, setTicker] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const analyze = useCallback(async (t: string) => {
        const q = t.trim().toUpperCase();
        if (!q) return;
        setQuery(q);
        setTicker(q);
        setLoading(true);
        setError('');
        setSummary(null);
        setSections([]);
        setCitations([]);
        setActive(0);


        try {
            // Call server-side proxy → avoids CORS and keeps key server-side
            const res = await fetch('/api/finance-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker: q }),
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
                throw new Error(errJson.error ?? `HTTP ${res.status}`);
            }

            const data = await res.json() as {
                content?: string;
                citations?: string[];
                ticker?: string;
            };

            const content = data.content ?? '';
            setCitations(data.citations ?? []);
            setSummary(extractQuickSummary(content, q));
            setSections(parseSections(content));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-search if ?q= param is present
    useEffect(() => {
        const q = params.get('q');
        if (q) analyze(q);
        else inputRef.current?.focus();
    }, []);// eslint-disable-line react-hooks/exhaustive-deps

    const onSubmit = (e?: React.FormEvent) => { e?.preventDefault(); analyze(query); };

    // ── Styles ──────────────────────────────────────────────────────────────────
    const page: React.CSSProperties = { minHeight: '100vh', background: '#060810', color: '#e2e8f0', fontFamily: "'Inter','Segoe UI',sans-serif", display: 'flex', flexDirection: 'column' };
    const hdr: React.CSSProperties = { background: 'rgba(8,12,24,0.96)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 14, backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 200 };
    const heroWrap: React.CSSProperties = { padding: '44px 24px 28px', maxWidth: 780, margin: '0 auto', width: '100%', boxSizing: 'border-box' };

    return (
        <div style={page}>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header style={hdr}>
                <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, color: '#94a3b8', padding: '5px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    ← Home
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📈</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '.5px', lineHeight: 1.1 }}>
                            AST <span style={{ color: '#f59e0b' }}>Finance</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#475569', letterSpacing: 1 }}>PERPLEXITY AI · REAL-TIME</div>
                    </div>
                </div>

                {ticker && !loading && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 800, fontSize: 18, color: '#f59e0b', letterSpacing: 1 }}>{ticker}</span>
                        {summary && (
                            <span style={{ padding: '3px 12px', borderRadius: 20, background: `${summary.verdictColor}20`, border: `1px solid ${summary.verdictColor}44`, color: summary.verdictColor, fontWeight: 700, fontSize: 11, letterSpacing: 1 }}>
                                {summary.verdict}
                            </span>
                        )}
                    </div>
                )}
            </header>

            {/* ── Hero search ────────────────────────────────────────────────── */}
            {!loading && !summary && (
                <div style={heroWrap}>
                    <div style={{ textAlign: 'center', marginBottom: 36 }}>
                        <h1 style={{ fontSize: 40, fontWeight: 900, margin: '0 0 10px', background: 'linear-gradient(135deg,#fef3c7,#f59e0b,#d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.15 }}>
                            Finance Analysis
                        </h1>
                        <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
                            AI-powered deep-dive — instant summary + full 8-section research report
                        </p>
                    </div>

                    {/* Search input */}
                    <form onSubmit={onSubmit} style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, opacity: .45 }}>🔍</span>
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Type stock ticker or name…  e.g. AAPL, RELIANCE.NS, NIFTY, BTC-USD"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '15px 16px 15px 44px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#e2e8f0', fontSize: 14, outline: 'none', transition: 'border-color .2s,box-shadow .2s' }}
                                onFocus={e => { e.target.style.borderColor = 'rgba(245,158,11,.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,.08)'; }}
                                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.1)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                        <button type="submit" disabled={!query.trim()} style={{ padding: '15px 26px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 14, color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(245,158,11,.35)', letterSpacing: .4, transition: 'all .2s' }}>
                            Analyse Now
                        </button>
                    </form>

                    {/* Quick picks */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                        {QUICK_PICKS.map(p => (
                            <button key={p.symbol} onClick={() => analyze(p.symbol)} style={{ padding: '7px 14px', background: `${p.color}14`, border: `1px solid ${p.color}30`, borderRadius: 24, color: p.color, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .18s', letterSpacing: .3, display: 'flex', alignItems: 'center', gap: 5 }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${p.color}26`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = `${p.color}14`; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                <span>{p.flag}</span> {p.symbol} <span style={{ opacity: .6, fontWeight: 400 }}>· {p.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Loading ────────────────────────────────────────────────────── */}
            {loading && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center' }}>
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
                    <div style={{ width: 72, height: 72, border: '3px solid rgba(245,158,11,.15)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 28 }} />
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', marginBottom: 8 }}>Analysing {ticker}…</div>
                    <div style={{ color: '#475569', fontSize: 13, marginBottom: 32 }}>Perplexity AI is scanning markets, filings & analyst reports</div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {[['💰', 'Prices'], ['📊', 'Fundamentals'], ['📰', 'News'], ['🎯', 'Targets'], ['🤖', 'Verdict']].map(([icon, label], i) => (
                            <div key={i} style={{ textAlign: 'center', animation: `pulse 1.4s ease ${i * .2}s infinite` }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: 18 }}>{icon}</div>
                                <div style={{ fontSize: 10, color: '#475569' }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Error ─────────────────────────────────────────────────────── */}
            {error && !loading && (
                <div style={{ maxWidth: 600, margin: '32px auto', padding: '16px 20px', background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 14, color: '#f87171', textAlign: 'center', fontSize: 13 }}>
                    ⚠️ {error}
                </div>
            )}

            {/* ── Results ───────────────────────────────────────────────────── */}
            {summary && sections.length > 0 && !loading && (
                <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 20px 56px', width: '100%', boxSizing: 'border-box' }}>

                    {/* ── Inline search bar (for new queries) ── */}
                    <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                        <input
                            value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="Search another ticker…"
                            style={{ flex: 1, padding: '9px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 10, color: '#e2e8f0', fontSize: 13, outline: 'none' }}
                        />
                        <button type="submit" style={{ padding: '9px 18px', background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 10, color: '#f59e0b', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                            Search
                        </button>
                    </form>

                    {/* ─────────────────────────────────────────── */}
                    {/* SIMPLE SUMMARY CARD                        */}
                    {/* ─────────────────────────────────────────── */}
                    <div style={{ background: 'linear-gradient(135deg,rgba(245,158,11,.1),rgba(217,119,6,.05))', border: '1px solid rgba(245,158,11,.2)', borderRadius: 20, padding: '28px 32px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
                        {/* BG glow */}
                        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle,rgba(245,158,11,.12),transparent 70%)', pointerEvents: 'none' }} />

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 24, justifyContent: 'space-between' }}>
                            {/* Left: ticker + oneliner */}
                            <div style={{ flex: '1 1 340px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                    <div style={{ fontSize: 30, fontWeight: 900, color: '#f59e0b', letterSpacing: 1 }}>{ticker}</div>
                                    <span style={{ padding: '4px 14px', borderRadius: 20, background: `${summary.verdictColor}20`, border: `1px solid ${summary.verdictColor}44`, color: summary.verdictColor, fontWeight: 800, fontSize: 12, letterSpacing: 1.2 }}>
                                        {summary.verdict}
                                    </span>
                                </div>
                                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, margin: '0 0 18px' }}>{summary.oneliner}</p>
                                {/* Key stats row */}
                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                    {[['Current Price', summary.price, '#4ade80'], ['12M Target', summary.target, '#60a5fa'], ['Risk Level', summary.risk, '#f87171']].map(([label, val, col]) => (
                                        <div key={label} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '10px 16px', minWidth: 100 }}>
                                            <div style={{ fontSize: 10, color: '#475569', letterSpacing: .8, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                                            <div style={{ fontSize: 16, fontWeight: 800, color: col }}>{val}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: buy/sell confidence bars */}
                            <div style={{ flex: '0 0 220px', background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, padding: 20 }}>
                                <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase', fontWeight: 700 }}>Signal Strength</div>
                                {[
                                    { label: 'Bull Signal', pct: summary.verdict.includes('BUY') ? (summary.verdict.includes('STRONG') ? 92 : 72) : (summary.verdict === 'HOLD' ? 45 : 20), color: '#4ade80' },
                                    { label: 'Bear Signal', pct: summary.verdict.includes('SELL') ? (summary.verdict.includes('STRONG') ? 88 : 65) : (summary.verdict === 'HOLD' ? 40 : 18), color: '#f87171' },
                                    { label: 'Momentum', pct: 58, color: '#60a5fa' },
                                    { label: 'Fundamental', pct: 74, color: '#a78bfa' },
                                ].map(({ label, pct, color }) => (
                                    <div key={label} style={{ marginBottom: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                                            <span style={{ color: '#94a3b8' }}>{label}</span>
                                            <span style={{ color, fontWeight: 700 }}>{pct}%</span>
                                        </div>
                                        <SparkBar pct={pct} color={color} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick section links */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 20, flexWrap: 'wrap' }}>
                            {sections.map((s, i) => (
                                <button key={i} onClick={() => { setActive(i); document.getElementById('detail-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                                    style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: '#94a3b8', fontSize: 11, cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,.1)'; e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.borderColor = 'rgba(245,158,11,.3)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; }}
                                >
                                    {s.icon} {s.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ─────────────────────────────────────────── */}
                    {/* DETAILED ANALYSIS                          */}
                    {/* ─────────────────────────────────────────── */}
                    <div id="detail-section" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>

                        {/* Left nav */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'start', position: 'sticky', top: 70 }}>
                            <div style={{ fontSize: 10, color: '#475569', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6, paddingLeft: 6 }}>Detailed Sections</div>
                            {sections.map((s, i) => (
                                <button key={i} onClick={() => setActive(i)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontSize: 12, fontWeight: 600, transition: 'all .15s',
                                        background: active === i ? `${s.color}14` : 'rgba(255,255,255,.025)',
                                        border: active === i ? `1px solid ${s.color}35` : '1px solid rgba(255,255,255,.05)',
                                        color: active === i ? s.color : '#64748b',
                                    }}>
                                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                                    <span style={{ lineHeight: 1.3 }}>{s.title}</span>
                                </button>
                            ))}

                            {/* Citations */}
                            {citations.length > 0 && (
                                <div style={{ marginTop: 12, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '12px 14px' }}>
                                    <div style={{ fontSize: 10, color: '#f59e0b', letterSpacing: 1, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>📚 Sources</div>
                                    {citations.slice(0, 6).map((c, i) => {
                                        let host = c;
                                        try { host = new URL(c).hostname.replace('www.', ''); } catch { /* ignore */ }
                                        return (
                                            <a key={i} href={c} target="_blank" rel="noopener noreferrer"
                                                style={{ display: 'block', fontSize: 11, color: '#60a5fa', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}
                                                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                            >
                                                [{i + 1}] {host}
                                            </a>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Right: section content */}
                        <div style={{ background: 'rgba(12,16,28,.85)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 18, padding: '28px 30px', minHeight: 420 }}>
                            {sections[active] && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 14, background: `${sections[active].color}15`, border: `1px solid ${sections[active].color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                                            {sections[active].icon}
                                        </div>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>{sections[active].title}</h2>
                                            <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{ticker} · AI Research · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                        </div>
                                        <div style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 10, background: `${sections[active].color}14`, border: `1px solid ${sections[active].color}25`, color: sections[active].color, fontSize: 10, fontWeight: 700, letterSpacing: .8 }}>
                                            SECTION {active + 1} / {sections.length}
                                        </div>
                                    </div>

                                    <div style={{ lineHeight: 1.7 }}>
                                        {renderContent(sections[active].content)}
                                    </div>

                                    {/* Prev / Next nav */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,.05)' }}>
                                        <button onClick={() => setActive(a => Math.max(0, a - 1))} disabled={active === 0}
                                            style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: active === 0 ? '#334155' : '#94a3b8', cursor: active === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            ← Prev
                                        </button>
                                        <button onClick={() => setActive(a => Math.min(sections.length - 1, a + 1))} disabled={active === sections.length - 1}
                                            style={{ padding: '8px 16px', borderRadius: 10, background: active === sections.length - 1 ? 'rgba(255,255,255,.03)' : 'rgba(245,158,11,.12)', border: `1px solid ${active === sections.length - 1 ? 'rgba(255,255,255,.06)' : 'rgba(245,158,11,.25)'}`, color: active === sections.length - 1 ? '#334155' : '#f59e0b', cursor: active === sections.length - 1 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            Next →
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div style={{ marginTop: 18, padding: '10px 16px', background: 'rgba(251,191,36,.04)', border: '1px solid rgba(251,191,36,.1)', borderRadius: 10, fontSize: 11, color: '#78716c' }}>
                        ⚠️ <strong style={{ color: '#a8a29e' }}>Disclaimer:</strong> AI-generated research for informational purposes only. Not financial advice. Do your own due diligence before investing.
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceAnalysis;
