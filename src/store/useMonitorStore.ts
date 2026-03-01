import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_MAP_LAYERS, DEFAULT_PANELS, SITE_VARIANT } from '@/config';

export interface MapLayers {
  conflicts: boolean;
  bases: boolean;
  hotspots: boolean;
  nuclear: boolean;
  irradiators: boolean;
  sanctions: boolean;
  military: boolean;
  protests: boolean;
  pipelines: boolean;
  waterways: boolean;
  ais: boolean;
  flights: boolean;
  spaceports: boolean;
  minerals: boolean;
  natural: boolean;
  fires: boolean;
  outages: boolean;
  cyberThreats: boolean;
  weather: boolean;
  economic: boolean;
  cables: boolean;
  datacenters: boolean;
  ucdpEvents: boolean;
  displacement: boolean;
  climate: boolean;
  iranAttacks: boolean;
  [key: string]: boolean;
}

export interface PanelConfig {
  name: string;
  enabled: boolean;
  priority: number;
}

export type Variant = 'full' | 'tech' | 'finance' | 'happy';

export interface MonitorStore {
  // Global App State
  mapLayers: MapLayers;
  panels: Record<string, PanelConfig>;
  variant: Variant;

  // News and Intelligence
  latestNews: any[];
  intelligenceBriefs: any[];
  aiModelReady: boolean;

  // Actions
  toggleLayer: (layer: keyof MapLayers) => void;
  setVariant: (variant: Variant) => void;
  setMapLayers: (layers: MapLayers) => void;
  updatePanelSettings: (panels: Record<string, PanelConfig>) => void;
}

export const useMonitorStore = create<MonitorStore>()(
  persist(
    (set) => ({
      mapLayers: { ...DEFAULT_MAP_LAYERS } as unknown as MapLayers,
      panels: { ...DEFAULT_PANELS } as unknown as Record<string, PanelConfig>,
      variant: SITE_VARIANT as Variant,
      latestNews: [],
      intelligenceBriefs: [],
      aiModelReady: false,

      toggleLayer: (layer) => set((state) => ({
        mapLayers: {
          ...state.mapLayers,
          [layer]: !state.mapLayers[layer]
        }
      })),

      setVariant: (variant) => set({ variant }),

      setMapLayers: (layers) => set({ mapLayers: layers }),

      updatePanelSettings: (panels) => set({ panels }),
    }),
    {
      name: 'world-monitor-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mapLayers: state.mapLayers,
        panels: state.panels,
        variant: state.variant
      }),
      // When the store rehydrates from localStorage, check if variant changed.
      // If it did (user switched WORLD/TECH/FINANCE), wipe the persisted layers
      // so this boot applies this variant's own defaults.
      onRehydrateStorage: () => (rehydrated) => {
        if (!rehydrated) return;
        const storedVariant = rehydrated.variant;
        const currentVariant = SITE_VARIANT as Variant;
        if (storedVariant && storedVariant !== currentVariant) {
          rehydrated.mapLayers = { ...DEFAULT_MAP_LAYERS } as unknown as MapLayers;
          rehydrated.panels = { ...DEFAULT_PANELS } as unknown as Record<string, PanelConfig>;
          rehydrated.variant = currentVariant;
        }
      },
    }
  )
);
