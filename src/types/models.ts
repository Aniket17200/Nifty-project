// Data Model types for World Monitor
export interface NewsFeed {
    id: string;
    sourceId: string;
    title: string;
    url: string;
    author?: string;
    content?: string;
    publishDate: string;
    lang: string;
    category: string;
    urgencyLevel: 'local' | 'regional' | 'global' | 'critical';
    geotags: {
        lat: number;
        lon: number;
        countryCode?: string;
    }[];
}

export interface MapLayerConfig {
    id: string;
    title: string;
    type: 'geojson' | 'icon' | 'text' | 'heatmap';
    visible: boolean;
    opacity: number;
    dataUrl?: string;
    refreshIntervalMs?: number;
}

export interface IntelligenceBrief {
    id: string;
    countryCode: string;
    summary: string;
    keyInsights: string[];
    threatLevel: 'low' | 'moderate' | 'high' | 'critical';
    confidenceScore: number;
    generatedAt: string;
    isLocalModel: boolean;
    sourceFeeds: string[];
}
