import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Types ──────────────────────────────────────────────────────────────────
interface ResearchResult {
    content: string;
    citations: string[];
    ticker: string;
}

interface Section {
    title: string;
    content: string;
    icon: string;
}

// ─── Popular tickers for quick access ───────────────────────────────────────
const POPULAR_TICKERS = [
    { symbol: 'AAPL', name: 'Apple', color: '#6ee7b7' },
    { symbol: 'NVDA', name: 'NVIDIA', color: '#86efac' },
    { symbol: 'TSLA', name: 'Tesla', color: '#fbbf24' },
    { symbol: 'MSFT', name: 'Microsoft', color: '#60a5fa' },
    { symbol: 'GOOGL', name: 'Google', color: '#f87171' },
    { symbol: 'META', name: 'Meta', color: '#818cf8' },
    { symbol: 'AMZN', name: 'Amazon', color: '#fb923c' },
    { symbol: 'BRK.B', name: 'Berkshire', color: '#a78bfa' },
    { symbol: 'RELIANCE.NS', name: 'Reliance', color: '#2dd4bf' },
    { symbol: 'TCS.NS', name: 'TCS', color: '#34d399' },
    { symbol: 'INFY.NS', name: 'Infosys', color: '#38bdf8' },
    { symbol: 'NIFTY', name: 'Nifty 50', color: '#f472b6' },
];

// ─── Parse Perplexity markdown into sections ─────────────────────────────────
function parseSections(raw: string): Section[] {
    const icons: Record<string, string> = {
        'Company Overview': '🏢',
        'Current Price': '💰',
        'Financial Performance': '📊',
        'Technical Analysis': '📈',
        'Bull Case': '🐂',
        'Bear Case': '🐻',
        'Analyst Consensus': '🎯',
        'AI Investment Verdict': '🤖',
    };

    const parts = raw.split(/^## \d+\.\s*/m).filter(Boolean);
    return parts.map((part) => {
        const lines = part.trim().split('\n');
        const titleLine = (lines[0] ?? '').replace(/^#+\s*/, '').trim();
        const content = lines.slice(1).join('\n').trim();
        const iconKey = Object.keys(icons).find(k => titleLine.includes(k)) ?? '';
        return {
            title: titleLine,
            content,
            icon: icons[iconKey] ?? '📋',
        };
    });
}

// ─── Verdict badge ───────────────────────────────────────────────────────────
function VerdictBadge({ content }: { content: string }) {
    const lower = content.toLowerCase();
    let label = 'HOLD';
    let color = '#fbbf24';
    if (lower.includes('strong buy')) { label = 'STRONG BUY'; color = '#22d3ee'; }
    else if (lower.includes('buy')) { label = 'BUY'; color = '#4ade80'; }
    else if (lower.includes('strong sell')) { label = 'STRONG SELL'; color = '#ef4444'; }
    else if (lower.includes('sell')) { label = 'SELL'; color = '#f87171'; }
    return (
        <span style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: '20px',
            background: `${color}22`, border: `1px solid ${color}55`,
            color, fontWeight: 700, fontSize: '12px', letterSpacing: '1px',
        }}>{label}</span>
    );
}

// ─── Format markdown text ────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
    return text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} style={{ color: '#e2e8f0', margin: '10px 0 4px', fontSize: '13px', fontWeight: 600 }}>{line.slice(4)}</h4>;
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} style={{ color: '#94a3b8', fontWeight: 600, margin: '4px 0', fontSize: '13px' }}>{line.slice(2, -2)}</p>;
        if (line.startsWith('- ')) return <li key={i} style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '3px', lineHeight: '1.6' }}>{line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
        if (line.trim() === '') return <br key={i} />;
        return <p key={i} style={{ color: '#94a3b8', fontSize: '13px', margin: '3px 0', lineHeight: '1.6' }}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
    });
}

// ─── Main Component ──────────────────────────────────────────────────────────
const StockResearch: React.FC = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResearchResult | null>(null);
    const [error, setError] = useState('');
    const [sections, setSections] = useState<Section[]>([]);
    const [activeSection, setActiveSection] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const search = async (ticker: string) => {
        const q = ticker.trim().toUpperCase();
        if (!q) return;
        setQuery(q);
        setLoading(true);
        setError('');
        setResult(null);
        setSections([]);

        try {
            const res = await fetch('/api/stock-research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker: q }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Research failed');
            setResult(data);
            setSections(parseSections(data.content));
            setActiveSection(0);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        search(query);
    };

    return (
        <div style={{
            minHeight: '100vh', background: 'linear-gradient(135deg, #0a0d14 0%, #0f1520 50%, #0a0f1a 100%)',
            color: '#e2e8f0', fontFamily: "'Inter', 'Segoe UI', sans-serif",
            display: 'flex', flexDirection: 'column',
        }}>
            {/* ── Header ── */}
            <div style={{
                background: 'rgba(15,21,32,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px',
                backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100,
            }}>
                <button onClick={() => navigate('/')} style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', color: '#94a3b8', padding: '6px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px',
                    transition: 'all 0.2s',
                }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                >
                    ← Back
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>📊</span>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: '#e2e8f0', letterSpacing: '0.5px' }}>
                        AST <span style={{ color: '#4ade80' }}>Stock Research</span>
                    </span>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#4ade80', opacity: 0.7, letterSpacing: '1px' }}>
                    POWERED BY PERPLEXITY AI
                </div>
            </div>

            {/* ── Hero search ── */}
            <div style={{
                padding: '48px 24px 32px', textAlign: 'center',
                background: 'linear-gradient(180deg, rgba(74,222,128,0.04) 0%, transparent 100%)',
            }}>
                <h1 style={{
                    fontSize: '38px', fontWeight: 800, marginBottom: '10px', lineHeight: 1.2,
                    background: 'linear-gradient(135deg, #f0fdf4, #4ade80, #22d3ee)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                    Deep Stock Research
                </h1>
                <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '36px' }}>
                    AI-powered equity analysis with real-time data • Bull/Bear case • Technical signals • Analyst consensus
                </p>

                {/* Search bar */}
                <form onSubmit={handleSubmit} style={{ maxWidth: '580px', margin: '0 auto 28px', display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', opacity: 0.5 }}>🔍</span>
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Enter ticker or name (e.g. AAPL, Reliance, NIFTY)..."
                            style={{
                                width: '100%', padding: '14px 16px 14px 42px', background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#e2e8f0',
                                fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                            }}
                            onFocus={e => {
                                e.target.style.borderColor = 'rgba(74,222,128,0.4)';
                                e.target.style.boxShadow = '0 0 0 3px rgba(74,222,128,0.08)';
                            }}
                            onBlur={e => {
                                e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>
                    <button type="submit" disabled={loading || !query.trim()} style={{
                        padding: '14px 24px', background: loading ? 'rgba(74,222,128,0.15)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                        border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '14px',
                        cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                        boxShadow: loading ? 'none' : '0 4px 20px rgba(34,197,94,0.3)',
                    }}>
                        {loading ? '⏳ Analysing...' : '🔬 Research'}
                    </button>
                </form>

                {/* Popular tickers */}
                <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                    {POPULAR_TICKERS.map(t => (
                        <button key={t.symbol} onClick={() => search(t.symbol)} style={{
                            padding: '6px 13px', background: `${t.color}12`, border: `1px solid ${t.color}30`,
                            borderRadius: '20px', color: t.color, fontSize: '11px', fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.18s', letterSpacing: '0.3px',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${t.color}22`; e.currentTarget.style.transform = 'scale(1.05)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = `${t.color}12`; e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            {t.symbol} <span style={{ opacity: 0.6 }}>· {t.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <div style={{
                        width: '64px', height: '64px', margin: '0 auto 24px',
                        border: '3px solid rgba(74,222,128,0.2)', borderTopColor: '#4ade80',
                        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>
                        Researching {query}...
                    </p>
                    <p style={{ color: '#475569', fontSize: '13px' }}>
                        Perplexity AI is scanning financial databases, news feeds & analyst reports
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '24px' }}>
                        {['Fetching price data', 'Analysing fundamentals', 'Scanning news', 'Generating verdict'].map((step, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: '14px' }}>
                                    {['💰', '📊', '📰', '🤖'][i]}
                                </div>
                                <span style={{ fontSize: '10px', color: '#475569' }}>{step}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Error ── */}
            {error && (
                <div style={{ maxWidth: '600px', margin: '24px auto', padding: '16px 20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', color: '#f87171', textAlign: 'center' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* ── Results ── */}
            {result && sections.length > 0 && (
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 48px', width: '100%', boxSizing: 'border-box' }}>

                    {/* Ticker header */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(74,222,128,0.08), rgba(34,211,238,0.05))',
                        border: '1px solid rgba(74,222,128,0.15)', borderRadius: '16px',
                        padding: '24px 28px', marginBottom: '24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
                    }}>
                        <div>
                            <div style={{ fontSize: '32px', fontWeight: 800, color: '#4ade80', letterSpacing: '1px' }}>{result.ticker}</div>
                            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>AI-generated equity research report • {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <VerdictBadge content={result.content} />
                            <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
                                Live research
                            </span>
                        </div>
                    </div>

                    {/* Tab navigation */}
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
                        {sections.map((s, i) => (
                            <button key={i} onClick={() => setActiveSection(i)} style={{
                                padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap',
                                fontSize: '12px', fontWeight: 600, border: '1px solid',
                                borderColor: activeSection === i ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.07)',
                                background: activeSection === i ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.03)',
                                color: activeSection === i ? '#4ade80' : '#64748b',
                                transition: 'all 0.18s',
                            }}>
                                {s.icon} {s.title.split('\n')[0]}
                            </button>
                        ))}
                    </div>

                    {/* Content grid: active section large + all sections small */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
                        {/* Active section detail */}
                        <div style={{
                            background: 'rgba(15,21,32,0.8)', border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '16px', padding: '28px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <span style={{ fontSize: '24px' }}>{sections[activeSection]?.icon}</span>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e2e8f0' }}>
                                    {sections[activeSection]?.title}
                                </h2>
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {renderMarkdown(sections[activeSection]?.content ?? '')}
                            </ul>
                        </div>

                        {/* Sidebar: all sections compact */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {sections.map((s, i) => (
                                <button key={i} onClick={() => setActiveSection(i)} style={{
                                    background: activeSection === i ? 'rgba(74,222,128,0.08)' : 'rgba(15,21,32,0.6)',
                                    border: `1px solid ${activeSection === i ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                    borderRadius: '12px', padding: '14px 16px', cursor: 'pointer',
                                    textAlign: 'left', transition: 'all 0.18s',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '16px' }}>{s.icon}</span>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: activeSection === i ? '#4ade80' : '#94a3b8' }}>{s.title}</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '11px', color: '#475569', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                        {s.content.replace(/[*#-]/g, '').slice(0, 90)}...
                                    </p>
                                </button>
                            ))}

                            {/* Citations */}
                            {result.citations?.length > 0 && (
                                <div style={{ background: 'rgba(15,21,32,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', marginBottom: '10px', letterSpacing: '0.8px' }}>📚 SOURCES</div>
                                    {result.citations.slice(0, 5).map((c, i) => (
                                        <a key={i} href={c} target="_blank" rel="noopener noreferrer" style={{
                                            display: 'block', fontSize: '11px', color: '#60a5fa', marginBottom: '6px',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            textDecoration: 'none',
                                        }}
                                            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                        >
                                            [{i + 1}] {new URL(c).hostname.replace('www.', '')}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div style={{ marginTop: '24px', padding: '12px 16px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)', borderRadius: '10px', fontSize: '11px', color: '#78716c' }}>
                        ⚠️ <strong style={{ color: '#a8a29e' }}>Disclaimer:</strong> This report is AI-generated for informational purposes only and does not constitute financial advice. Always consult a qualified financial advisor before making investment decisions.
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockResearch;
