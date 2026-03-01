import React, { Suspense, useEffect, useRef, useState } from 'react';
import AppSkeleton from '../components/shared/AppSkeleton';
import { PanelLayoutManager } from '../app/panel-layout';
import { DataLoaderManager } from '../app/data-loader';
import { EventHandlerManager } from '../app/event-handlers';
import type { AppContext } from '../app/app-context';
import { useMonitorStore } from '../store/useMonitorStore';

const DashboardRenderer: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const contextRef = useRef<AppContext | null>(null);
    const layoutManagerRef = useRef<PanelLayoutManager | null>(null);
    const loaderManagerRef = useRef<DataLoaderManager | null>(null);
    const eventHandlerRef = useRef<EventHandlerManager | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        if (contextRef.current) return; // Prevent double initialization in strict mode

        const store = useMonitorStore.getState();

        const ctx: AppContext = {
            map: null,
            isMobile: window.innerWidth <= 768,
            isDesktopApp: !!(window as any).__TAURI__,
            container: containerRef.current,

            panels: {},
            newsPanels: {},
            panelSettings: store.panels,
            mapLayers: store.mapLayers as any,

            allNews: [],
            newsByCategory: {},
            latestMarkets: [],
            latestPredictions: [],
            latestClusters: [],
            intelligenceCache: {},
            cyberThreatsCache: null,

            disabledSources: new Set(),
            currentTimeRange: '7d',

            inFlight: new Set(),
            seenGeoAlerts: new Set(),
            monitors: [],

            signalModal: null,
            statusPanel: null,
            searchModal: null,
            findingsBadge: null,
            breakingBanner: null,
            playbackControl: null,
            exportPanel: null,
            unifiedSettings: null,
            mobileWarningModal: null,
            pizzintIndicator: null,
            countryBriefPage: null,
            countryTimeline: null,

            positivePanel: null,
            countersPanel: null,
            progressPanel: null,
            breakthroughsPanel: null,
            heroPanel: null,
            digestPanel: null,
            speciesPanel: null,
            renewablePanel: null,
            tvMode: null,
            happyAllItems: [],

            isDestroyed: false,
            isPlaybackMode: false,
            isIdle: false,
            initialLoadComplete: false,

            initialUrlState: null,
            PANEL_ORDER_KEY: 'worldmonitor-panels',
            PANEL_SPANS_KEY: 'worldmonitor-spans',
        };

        contextRef.current = ctx;

        // Init layout (renders HTML skeleton + creates MapContainer inside ctx.map)
        const layout = new PanelLayoutManager(ctx, {
            openCountryStory: () => { },
            loadAllData: async () => { },
            updateMonitorResults: () => { },
        });
        layoutManagerRef.current = layout;
        layout.init();

        // Init data loader
        const loader = new DataLoaderManager(ctx, {
            renderCriticalBanner: (postures) => layout.renderCriticalBanner(postures),
        });
        loaderManagerRef.current = loader;

        // Connect loader back to layout
        layout['callbacks'].loadAllData = () => loader.loadAllData();

        // Init event handlers — this wires up regionSelect, theme toggle, 
        // fullscreen, search, unified settings gear, map layer callbacks, etc.
        const events = new EventHandlerManager(ctx, {
            updateSearchIndex: () => { },
            loadAllData: () => loader.loadAllData(),
            flushStaleRefreshes: () => loader.loadAllData().catch(console.error),
            setHiddenSince: (_ts: number) => { },
            loadDataForLayer: (_layer: string) => loader.loadAllData().catch(console.error),
            waitForAisData: () => { },
            syncDataFreshnessWithLayers: () => { },
        });
        eventHandlerRef.current = events;
        events.init();

        // Wire up map-layer change callbacks so toggling layers fetches data
        events.setupMapLayerHandlers();

        // Hook up unified settings gear icon in the header
        events.setupUnifiedSettings();
        events.setupStatusPanel();
        events.setupPizzIntIndicator();
        events.startHeaderClock();
        events.setupMobileWarning();

        // URL state sync (keeps regionSelect in sync with map pan/zoom)
        events.setupUrlStateSync();

        // Apply panel visibility from stored settings
        events.applyPanelSettings();

        // Add class to container
        containerRef.current.classList.add('app-wrapper', 'fade-in');

        // Release the skeleton overlay immediately — panels handle their own loading states
        setIsLoaded(true);

        loader.loadAllData().catch(console.error);

        return () => {
            ctx.isDestroyed = true;
            events.destroy();
            layout.destroy();
            loader.destroy();
        };
    }, []);

    return (
        <div className="w-full h-screen relative">
            <div ref={containerRef} className="w-full h-full text-slate-200" style={{ display: isLoaded ? 'flex' : 'none' }} />
            {!isLoaded && <AppSkeleton />}
        </div>
    );
};

const Home: React.FC = () => {
    return (
        <div className="w-full h-screen bg-gradient-to-br from-[#0f1115] to-[#1a1c23] text-slate-200 overflow-hidden flex flex-col font-sans relative">
            <Suspense fallback={<AppSkeleton />}>
                <DashboardRenderer />
            </Suspense>
        </div>
    );
};

export default Home;
