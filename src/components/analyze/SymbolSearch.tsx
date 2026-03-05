import React, { useState } from 'react';
import { Search, X, TrendingUp } from 'lucide-react';
import { POPULAR_STOCKS, POPULAR_CRYPTO, POPULAR_INDICES } from './types';

interface Props { onSelect: (symbol: string, name: string) => void; current: string; }

export function SymbolSearch({ onSelect, current }: Props) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<'stocks' | 'crypto' | 'indices'>('stocks');

    const filtered = (list: { s: string; n: string }[]) =>
        q.trim() ? list.filter(x => x.s.toLowerCase().includes(q.toLowerCase()) || x.n.toLowerCase().includes(q.toLowerCase())) : list;

    const pick = (s: string, n: string) => { onSelect(s, n); setOpen(false); setQ(''); };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && q.trim()) { pick(q.trim().toUpperCase(), q.trim().toUpperCase()); }
    };

    return (
        <div className="relative">
            <button onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-all group">
                <Search size={12} className="text-slate-500 group-hover:text-orange-400 transition-colors" />
                <span className="font-mono font-bold text-orange-400">{current}</span>
                <span className="text-slate-600">Change Symbol</span>
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Search input */}
                    <div className="p-2 border-b border-slate-800">
                        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                            <Search size={13} className="text-slate-500 shrink-0" />
                            <input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={handleKey}
                                placeholder="Type symbol or name, press Enter…"
                                className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none font-mono" />
                            {q && <button onClick={() => setQ('')}><X size={12} className="text-slate-500 hover:text-slate-300" /></button>}
                        </div>
                        {q && (
                            <button onClick={() => pick(q.trim().toUpperCase(), q.trim().toUpperCase())}
                                className="w-full mt-1.5 text-xs text-orange-400 hover:text-orange-300 font-mono py-1 hover:bg-slate-800 rounded transition-all">
                                → Load "{q.toUpperCase()}"
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-800">
                        {(['stocks', 'crypto', 'indices'] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`flex-1 py-2 text-[10px] font-bold uppercase transition-all ${tab === t ? 'text-orange-400 border-b-2 border-orange-500' : 'text-slate-600 hover:text-slate-400'}`}>
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* Symbol Grid */}
                    <div className="p-2 max-h-56 overflow-y-auto">
                        {filtered(tab === 'stocks' ? POPULAR_STOCKS : tab === 'crypto' ? POPULAR_CRYPTO : POPULAR_INDICES).map(x => (
                            <button key={x.s} onClick={() => pick(x.s, x.n)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-slate-800 transition-all ${current === x.s ? 'bg-slate-800 text-orange-400' : 'text-slate-300'}`}>
                                <span className="font-mono font-bold">{x.s}</span>
                                <span className="text-slate-500">{x.n}</span>
                                {current === x.s && <TrendingUp size={11} className="text-orange-400" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Backdrop */}
            {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
        </div>
    );
}
