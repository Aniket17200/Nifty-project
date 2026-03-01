import React from 'react';

const AppSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col h-screen font-sans bg-gradient-to-br from-[#0f1115] to-[#1a1c23] overflow-hidden text-slate-200" aria-hidden="true">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between h-16 px-6 bg-white/[0.02] backdrop-blur-xl border-b border-white/5 shrink-0 z-10 relative shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.1)]"></div>
                    <div className="h-5 rounded bg-indigo-500/10 w-32 animate-pulse border border-indigo-500/20"></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="h-8 rounded-full bg-white/5 w-24 animate-pulse border border-white/10"></div>
                    <div className="h-8 rounded-full bg-white/5 w-8 animate-pulse border border-white/10"></div>
                    <div className="h-8 rounded-full bg-blue-500/20 w-10 animate-pulse border border-blue-500/30"></div>
                </div>
            </div>

            {/* Main Skeleton */}
            <div className="flex flex-col flex-1 overflow-hidden relative">
                {/* Decorative Elements */}
                <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

                {/* Map Area */}
                <div className="flex flex-col flex-shrink-0 h-[45vh] min-h-[300px] bg-black/20 border-b border-white/5 relative overflow-hidden backdrop-blur-sm">
                    {/* Animated Map Gradient */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.08)_0%,transparent_70%)] animate-pulse" style={{ animationDuration: '4s' }}></div>

                    <div className="absolute top-4 left-4 z-10">
                        <div className="h-8 rounded-lg bg-white/5 backdrop-blur-md w-48 border border-white/10 animate-pulse"></div>
                    </div>
                </div>

                {/* Main Content Grid Area (With padding) */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                            <div key={idx} className="flex flex-col bg-white/[0.02] backdrop-blur-md border border-white/5 h-[320px] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300">
                                {/* Panel Header block */}
                                <div className="flex items-center justify-between h-14 px-5 border-b border-white/5 bg-white/[0.01]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded bg-blue-500/20 animate-pulse"></div>
                                        <div className="h-4 rounded bg-white/10 w-28 animate-pulse"></div>
                                    </div>
                                    <div className="w-6 h-6 rounded-full bg-white/5 animate-pulse"></div>
                                </div>
                                {/* Panel Content block */}
                                <div className="flex flex-col gap-4 p-5 flex-1">
                                    {/* Big Chart/Hero block */}
                                    <div className="h-24 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 w-full animate-pulse"></div>

                                    {/* Small items */}
                                    <div className="space-y-3 mt-auto">
                                        <div className="h-3 rounded bg-white/10 w-[85%] animate-pulse"></div>
                                        <div className="h-3 rounded bg-white/10 w-[60%] animate-pulse"></div>
                                        <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
                                            <div className="h-6 rounded-full bg-white/5 w-16 animate-pulse"></div>
                                            <div className="h-6 rounded-full bg-white/5 w-16 animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppSkeleton;
