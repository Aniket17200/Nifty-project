import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { LineChart, BarChart2, Globe, Send, Bot, Sparkles } from 'lucide-react';

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
}

export default function StartPage() {
    const navigate = useNavigate();

    // --- Chart State & Ref ---
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [chartSymbol, setChartSymbol] = useState('AAPL');
    const chartInstanceRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    // --- Chat State ---
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '1', role: 'model', text: 'Hi there! I am your AI financial assistant powered by Gemini. Ask me about markets, stocks, or general finance!' }
    ]);
    const [inputMsg, setInputMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- Initialize Chart & Fetch Data ---
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Create TradingView Chart
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
            height: 600,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        });

        chartInstanceRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries as any;

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
    }, []);

    useEffect(() => {
        // Fetch Yahoo Finance Data
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/yahoo-finance/chart?symbol=${chartSymbol}&interval=1d&range=3mo`);
                if (!res.ok) throw new Error('Data fetch failed');
                const data = await res.json();

                const result = data?.chart?.result?.[0];
                if (!result) return;

                const timestamps = result.timestamp;
                const quote = result.indicators.quote[0];

                // Format data for lightweight-charts
                const formattedData: any[] = [];
                const seenTimes = new Set();

                for (let i = 0; i < timestamps.length; i++) {
                    if (quote.open[i] === null || quote.high[i] === null || quote.low[i] === null || quote.close[i] === null) continue;

                    const date = new Date(timestamps[i] * 1000);
                    // Standardize time for daily charts (YYYY-MM-DD)
                    const timeString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

                    if (!seenTimes.has(timeString)) {
                        seenTimes.add(timeString);
                        formattedData.push({
                            time: timeString,
                            open: quote.open[i],
                            high: quote.high[i],
                            low: quote.low[i],
                            close: quote.close[i],
                        });
                    }
                }

                // Sort ascending just in case
                formattedData.sort((a, b) => a.time.localeCompare(b.time));

                candlestickSeriesRef.current?.setData(formattedData);
                chartInstanceRef.current?.timeScale().fitContent();

            } catch (err) {
                console.error('Error fetching chart data:', err);
            }
        };

        fetchData();
    }, [chartSymbol]);

    // --- Handle Gemini Chat ---
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMsg.trim() || isLoading) return;

        const userMessage = inputMsg.trim();
        setInputMsg('');
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMessage }]);
        setIsLoading(true);

        try {
            // Pass all previous messages except the very first greeting to provide context
            const historyContext = messages.slice(1).map(m => ({ role: m.role, text: m.text }));

            const res = await fetch('/api/gemini-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userMessage, history: historyContext }),
            });

            if (!res.ok) throw new Error('Failed to fetch from Gemini');

            const data = await res.json();
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: data.response }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Error connecting to AI. Please verify API key setup.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen bg-gradient-to-br from-[#0f1115] to-[#1a1c23] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-y-auto custom-scrollbar">

            {/* --- NAVBAR SECTION --- */}
            <nav className="w-full border-b border-indigo-500/10 bg-[#0a0f1a]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo area */}
                    <div className="flex items-center gap-2">
                        <svg className="text-indigo-500" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="3" />
                            <circle cx="4" cy="7" r="2" />
                            <circle cx="20" cy="7" r="2" />
                            <circle cx="4" cy="17" r="2" />
                            <circle cx="20" cy="17" r="2" />
                            <line x1="6" y1="8" x2="10" y2="11" />
                            <line x1="18" y1="8" x2="14" y2="11" />
                            <line x1="6" y1="16" x2="10" y2="13" />
                            <line x1="18" y1="16" x2="14" y2="13" />
                        </svg>
                        <span className="font-bold text-xl tracking-wide">AST <span className="text-indigo-400">STRATEGIE</span></span>
                        <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md ml-2 border border-slate-700/50">v2.5.20</span>
                    </div>

                    {/* Nav Buttons */}
                    <div className="hidden md:flex items-center gap-2">
                        <button
                            onClick={() => navigate('/monitor')}
                            className="group flex items-center gap-2 px-4 py-2 hover:bg-slate-800 text-slate-300 rounded-lg text-sm font-semibold transition-all"
                        >
                            <Globe size={16} className="text-indigo-400 group-hover:rotate-12 transition-transform" />
                            World Monitor
                        </button>
                        <button
                            onClick={() => navigate('/stock-research')}
                            className="group flex items-center gap-2 px-4 py-2 hover:bg-slate-800 text-slate-300 rounded-lg text-sm font-semibold transition-all"
                        >
                            <LineChart size={16} className="text-green-400 group-hover:scale-110 transition-transform" />
                            Stock Research
                        </button>
                        <button
                            onClick={() => navigate('/finance-analysis')}
                            className="group flex items-center gap-2 px-4 py-2 hover:bg-slate-800 text-slate-300 rounded-lg text-sm font-semibold transition-all"
                        >
                            <BarChart2 size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
                            Finance Analysis
                        </button>
                    </div>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <div className="relative overflow-hidden border-b border-indigo-500/10">
                <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>

                <div className="container mx-auto px-6 py-12 lg:py-16 relative z-10 flex flex-col items-center text-center">
                    <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold">
                        <Sparkles size={16} /> Welcome to the Future of Finance
                    </div>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                        Stratig Terminal
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-4">
                        Your all-in-one AI-powered financial command center. Monitor global events, analyze stocks with AI, and track markets in real-time.
                    </p>
                </div>
            </div>

            {/* --- DASHBOARD SECTION --- */}
            <div className="container mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Panel: TradingView Chart */}
                    <div className="lg:col-span-2 bg-[#0d1424] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800/60 bg-slate-900/40">
                            <h2 className="font-bold flex items-center gap-2">
                                <LineChart size={18} className="text-blue-400" /> Real-Time Markets
                            </h2>
                            <select
                                value={chartSymbol}
                                onChange={(e) => setChartSymbol(e.target.value)}
                                className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="AAPL">AAPL (Apple)</option>
                                <option value="MSFT">MSFT (Microsoft)</option>
                                <option value="NVDA">NVDA (NVIDIA)</option>
                                <option value="TSLA">TSLA (Tesla)</option>
                                <option value="BTC-USD">BTC-USD (Bitcoin)</option>
                                <option value="^GSPC">S&P 500</option>
                            </select>
                        </div>
                        {/* Chart Container */}
                        <div ref={chartContainerRef} className="w-full h-[600px] bg-[#0a0f1a]"></div>
                    </div>

                    {/* Right Panel: Gemini Chat */}
                    <div className="bg-[#0d1424] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[600px]">
                        <div className="p-4 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-2">
                            <Bot size={18} className="text-purple-400" />
                            <h2 className="font-bold">Gemini AI Assistant</h2>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-none'
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 text-slate-400 border border-slate-700/50 rounded-2xl rounded-bl-none px-4 py-2.5 text-sm flex gap-1 items-center">
                                        <span className="animate-bounce">●</span>
                                        <span className="animate-bounce delay-75">●</span>
                                        <span className="animate-bounce delay-150">●</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-3 bg-slate-900/60 border-t border-slate-800/80">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={inputMsg}
                                    onChange={(e) => setInputMsg(e.target.value)}
                                    placeholder="Ask Gemini about finance..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder-slate-500"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !inputMsg.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-lg transition-colors"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
