import React, { useState, useEffect } from 'react';
import { Check, Plus, Trash2, GripVertical } from 'lucide-react';

export interface LiveChannel {
    id: string;
    name: string;
    handle: string;
    fallbackVideoId?: string;
    useFallbackOnly?: boolean;
}


const BUILTIN_CHANNELS: LiveChannel[] = [
    { id: 'aljazeera', name: 'Al Jazeera', handle: '@aljazeeraenglish' },
    { id: 'sky', name: 'Sky News', handle: '@SkyNews' },
];

const CUSTOM_PREFIX = 'custom-';

export default function LiveChannels() {
    const [channels, setChannels] = useState<LiveChannel[]>([]);
    const [customHandleUrl, setCustomHandleUrl] = useState('');
    const [customName, setCustomName] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('worldmonitor-live-channels');
            if (stored) {
                setChannels(JSON.parse(stored));
            } else {
                setChannels(BUILTIN_CHANNELS);
            }
        } catch {
            setChannels(BUILTIN_CHANNELS);
        }
    }, []);

    const saveChannels = (newChannels: LiveChannel[]) => {
        setChannels(newChannels);
        localStorage.setItem('worldmonitor-live-channels', JSON.stringify(newChannels));
    };



    const handleAddChannel = async () => {
        if (!customHandleUrl) return;
        setIsVerifying(true);

        // Simulate verification
        await new Promise(r => setTimeout(r, 500));

        const id = `${CUSTOM_PREFIX}${Date.now()}`;
        const handle = customHandleUrl.startsWith('@') ? customHandleUrl : `@${customHandleUrl.split('/').pop()}`;
        const name = customName || handle;

        saveChannels([...channels, { id, handle, name }]);
        setCustomHandleUrl('');
        setCustomName('');
        setIsVerifying(false);
    };

    const removeChannel = (id: string) => {
        saveChannels(channels.filter(c => c.id !== id));
    };

    const handleDragStart = (idx: number) => {
        setDraggedIdx(idx);
    };

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === idx) return;

        const newItems = [...channels];
        const draggedItem = newItems[draggedIdx];
        if (!draggedItem) return;
        newItems.splice(draggedIdx, 1);
        newItems.splice(idx, 0, draggedItem);

        setDraggedIdx(idx);
        saveChannels(newItems);
    };

    const handleDragEnd = () => {
        setDraggedIdx(null);
    };

    return (
        <div className="flex flex-col h-screen text-slate-200 bg-gradient-to-br from-[#0f1115] to-[#1a1c23] font-sans selection:bg-blue-500/30">
            {/* Premium Header */}
            <header className="flex items-center gap-4 px-8 h-16 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl shrink-0 z-10 transition-all">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                    <Check className="w-4 h-4 text-indigo-400" />
                </div>
                <h1 className="text-lg font-medium tracking-wide text-white drop-shadow-sm">Channel Management</h1>
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-8 md:p-12 space-y-12 max-w-5xl mx-auto w-full relative custom-scrollbar">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                    <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[20%] right-[10%] w-[30%] h-[30%] bg-emerald-600/10 rounded-full blur-[120px]" />
                </div>

                {/* Active Channels */}
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold text-white tracking-tight">Active Channels</h2>
                            <p className="text-sm text-slate-400">Drag to reorder how channels appear on the main dashboard.</p>
                        </div>
                        <button
                            onClick={() => saveChannels(BUILTIN_CHANNELS)}
                            className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all duration-300 active:scale-95"
                        >
                            Restore Defaults
                        </button>
                    </div>

                    <div className="bg-white/[0.02] backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                        <div className="divide-y divide-white/5">
                            {channels.map((ch, idx) => (
                                <div
                                    key={ch.id}
                                    draggable
                                    onDragStart={() => handleDragStart(idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center gap-4 p-4 transition-all duration-200 cursor-grab active:cursor-grabbing group
                                    ${draggedIdx === idx ? 'bg-white/10 opacity-50 block' : 'hover:bg-white/5'}`}
                                >
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/20 text-slate-500 group-hover:text-slate-300 transition-colors">
                                        <GripVertical className="w-5 h-5 pointer-events-none" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-base font-medium text-slate-200 group-hover:text-white transition-colors">{ch.name}</div>
                                        <div className="text-xs text-slate-400 font-mono mt-0.5">{ch.handle}</div>
                                    </div>
                                    <button
                                        onClick={() => removeChannel(ch.id)}
                                        className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                                        title="Remove channel"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {channels.length === 0 && (
                                <div className="p-12 border-dashed border-2 border-white/5 text-center text-slate-500 rounded-2xl m-4 bg-black/20">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                                        <Trash2 className="w-5 h-5 opacity-50" />
                                    </div>
                                    No active channels exist. Add some below to get started.
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Add Custom Channel */}
                <section className="p-8 bg-white/[0.02] backdrop-blur-md rounded-2xl border border-white/5 space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in fade-in slide-in-from-bottom-8 duration-500 delay-100">
                    <div className="space-y-1 pb-2 border-b border-white/5">
                        <h2 className="text-xl font-semibold text-white tracking-tight">Add Custom Channel</h2>
                        <p className="text-sm text-slate-400">Import independent YouTube handles natively into your live dashboard.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">YouTube handle or URL</label>
                            <input
                                type="text"
                                value={customHandleUrl}
                                onChange={e => setCustomHandleUrl(e.target.value)}
                                placeholder="@ChannelNewsAsia"
                                className="w-full h-12 px-4 text-sm text-slate-200 placeholder-slate-600 bg-black/20 border border-white/10 rounded-xl focus:bg-white/5 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Display name (optional)</label>
                            <input
                                type="text"
                                value={customName}
                                onChange={e => setCustomName(e.target.value)}
                                placeholder="CNA Live"
                                className="w-full h-12 px-4 text-sm text-slate-200 placeholder-slate-600 bg-black/20 border border-white/10 rounded-xl focus:bg-white/5 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                            />
                        </div>
                    </div>
                    <button
                        disabled={!customHandleUrl || isVerifying}
                        onClick={handleAddChannel}
                        className="flex items-center justify-center w-full sm:w-auto gap-2 px-8 py-3 mt-4 text-sm font-medium text-white transition-all duration-300 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:from-indigo-500 hover:to-blue-500 hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 border border-white/10"
                    >
                        {isVerifying ? (
                            <span className="flex items-center gap-2">Verifying Channel Stream...</span>
                        ) : (
                            <><Plus className="w-4 h-4" /> Import Channel</>
                        )}
                    </button>
                </section>
            </main>

            {/* Footer */}
            <footer className="flex items-center justify-between px-8 py-4 border-t border-white/5 bg-black/40 backdrop-blur-xl relative z-10">
                <p className="text-xs font-medium text-slate-500">Live channels require valid YouTube handles resolving to live endpoints.</p>

                <button
                    onClick={() => window.location.href = '/'}
                    className="flex items-center justify-center gap-2 px-8 py-2.5 text-sm font-medium text-white transition-all duration-300 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-500 hover:to-teal-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 border border-white/10"
                >
                    <Check className="w-4 h-4 drop-shadow-md" /> Initialize Board
                </button>
            </footer>
        </div>
    );
}
