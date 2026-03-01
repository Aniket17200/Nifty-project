import React, { useState } from 'react';
import { Settings as SettingsIcon, Search, X, Check } from 'lucide-react';
import { useMonitorStore } from '../store/useMonitorStore';

const MOCK_SECTIONS = [
    { id: 'general', label: 'General' },
    { id: 'map', label: 'Map Layers' },
    { id: 'ai', label: 'AI Configuration' },
    { id: 'data', label: 'Feeds & Data' },
];

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [searchQuery, setSearchQuery] = useState('');

    const { mapLayers, toggleLayer } = useMonitorStore();

    const handleSaveAndClose = () => {
        window.location.href = '/';
    };

    const handleCancel = () => {
        window.location.href = '/';
    };

    return (
        <div className="flex flex-col h-screen text-slate-200 bg-gradient-to-br from-[#0f1115] to-[#1a1c23] font-sans selection:bg-blue-500/30">
            {/* Premium Header */}
            <header className="flex items-center gap-4 px-8 h-16 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl shrink-0 z-10 transition-all">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                    <SettingsIcon className="w-4 h-4 text-blue-400" />
                </div>
                <h1 className="text-lg font-medium tracking-wide text-white drop-shadow-sm">System Settings</h1>
                <span className="px-2.5 py-1 ml-auto font-mono text-xs font-medium text-emerald-400 border border-emerald-500/20 rounded-full bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    v2.5.20
                </span>
            </header>

            {/* Main layout */}
            <main className="flex flex-1 min-h-0 overflow-hidden relative">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
                </div>

                {/* Sidebar Nav */}
                <aside className="flex flex-col flex-shrink-0 w-72 border-r border-white/5 bg-black/20 backdrop-blur-md">
                    <div className="p-6">
                        <div className="relative group">
                            <Search className="absolute w-4 h-4 text-slate-400 transition-colors group-focus-within:text-blue-400 translate-y-1/2 bottom-1/2 left-3.5" />
                            <input
                                type="text"
                                placeholder="Search preferences..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 bg-white/5 border border-white/10 rounded-xl outline-none transition-all focus:bg-white/10 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>
                    </div>

                    <nav className="flex flex-col flex-1 px-4 pb-6 gap-1 overflow-y-auto custom-scrollbar">
                        {MOCK_SECTIONS.filter(sec => sec.label.toLowerCase().includes(searchQuery.toLowerCase())).map((section) => {
                            const isActive = activeTab === section.id;
                            return (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveTab(section.id)}
                                    className={`relative flex items-center px-4 py-3 text-sm font-medium transition-all duration-300 rounded-xl overflow-hidden text-left
                                    ${isActive
                                            ? 'text-white bg-blue-500/10 shadow-[inner_0_0_20px_rgba(59,130,246,0.05)] border border-blue-500/20'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    {isActive && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-blue-500 rounded-r-md shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                    )}
                                    <span className="relative z-10 truncate pl-2">{section.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Content Area */}
                <section className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar relative">
                    <div className="max-w-4xl mx-auto">
                        {activeTab === 'general' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-semibold text-white tracking-tight">General Settings</h2>
                                    <p className="text-slate-400 leading-relaxed">Customize your application experience, themes, and regional preferences across the dashboard.</p>
                                </div>
                                <div className="h-64 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-center p-8 text-slate-500 border-dashed backdrop-blur-sm">
                                    General preferences interface will be mounted here.
                                </div>
                            </div>
                        )}
                        {activeTab === 'map' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-semibold text-white tracking-tight">Geospatial Data Layers</h2>
                                    <p className="text-slate-400 leading-relaxed">Toggle the visibility of real-time intelligence feeds overlaid on the primary 3D DeckGL visualization map.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mt-8">
                                    {Object.entries(mapLayers).map(([key, isEnabled]) => (
                                        <label
                                            key={key}
                                            className={`group relative flex items-start gap-4 p-5 transition-all duration-300 border rounded-2xl cursor-pointer backdrop-blur-md overflow-hidden
                                            ${isEnabled ? 'bg-blue-500/10 border-blue-500/30 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.1)]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative pt-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isEnabled as boolean}
                                                    onChange={() => toggleLayer(key as keyof typeof mapLayers)}
                                                    className="w-5 h-5 text-blue-500 bg-black/20 border-white/20 rounded shadow-sm focus:ring-blue-500 focus:ring-offset-gray-900 focus:ring-2 cursor-pointer transition-colors"
                                                />
                                            </div>
                                            <div className="flex flex-col relative z-10">
                                                <span className={`text-base font-medium transition-colors ${isEnabled ? 'text-blue-100' : 'text-slate-300 group-hover:text-white'}`}>
                                                    {key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
                                                </span>
                                                <span className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                    Toggle realtime data stream for this layer on the master view.
                                                </span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="flex items-center justify-between px-8 py-4 border-t border-white/5 bg-black/40 backdrop-blur-xl relative z-10">
                <p className="text-xs font-medium text-slate-500">Changes apply globally across the dashboard state.</p>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleCancel}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-slate-300 transition-all duration-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white hover:border-white/20 active:scale-95"
                    >
                        <X className="w-4 h-4 opacity-70" /> Discard
                    </button>
                    <button
                        onClick={handleSaveAndClose}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 border border-white/10"
                    >
                        <Check className="w-4 h-4 drop-shadow-md" /> Apply &amp; Return
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default Settings;
