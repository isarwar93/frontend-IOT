// src/store/useGraphStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// ----- Types that match your current GraphConfigPage + BleConfig -----
export type LineDef = {
  label: string;                 // e.g. "Heart Rate"
  byteIndex: string | number;    // e.g. "hr" or 1 (used to pick value from JSON)
};
export interface GraphLine {
  label: string;
  byteIndex: string | number;
}

export interface GraphConfigItem {
  id: string;
  title: string;
  sourceUUID: string;
  lines: GraphLine[];
  waveforms?: number; // <-- add this
}

// One row of time series data per graph:
export type GraphRow = {
  timestamp: number;             // ms since epoch (auto-added on push)
} & Record<string, number>;      // series values keyed by line.label

// ----- Extra global settings you requested -----
export type AxisSettings = {
  fixed: boolean;
  min: number;
  max: number;
  tickCount?: number;
};

export type DisplaySettings = {
  useBar: boolean;
  showGrid: boolean;
  showLegend: boolean;
  smooth: boolean;               // for line charts
  height: number;                // px per chart panel
  widthPct: number;              // width percentage (for ResponsiveContainer)
  primaryColor: string;          // default color for first series
};

// ----- Store shape -----
type GraphStore = {
  // Graph configs
  configs: GraphConfigItem[];
  addConfig: (cfg: GraphConfigItem) => void;
  removeConfig: (id: string) => void;
  clearConfigs: () => void;

  // Live data per config (rolling buffer)
  data: Record<string, GraphRow[]>;
  bufferSize: number;
  setBufferSize: (n: number) => void;
  pushData: (configId: string, row: Record<string, number>) => void;
  clearData: (configId?: string) => void;

  // Global layout / behavior
  numGraphs: number;
  setNumGraphs: (n: number) => void;

  axis: AxisSettings;
  setAxis: (next: Partial<AxisSettings> | AxisSettings) => void;

  display: DisplaySettings;
  setDisplay: (next: Partial<DisplaySettings> | DisplaySettings) => void;
};

// ----- Defaults -----
const DEFAULT_AXIS: AxisSettings = {
  fixed: false,
  min: -100,
  max: 100,
  tickCount: 5,
};

const DEFAULT_DISPLAY: DisplaySettings = {
  useBar: false,
  showGrid: true,
  showLegend: true,
  smooth: true,
  height: 280,
  widthPct: 100,
  primaryColor: "#3b82f6", // Tailwind blue-500
};

export const useGraphStore = create<GraphStore>()(
  devtools(
    persist(
      (set, get) => ({
        // ---- Configs ----
        configs: [],
        addConfig: (cfg) =>
          set((s) => ({ configs: [...s.configs, cfg] })),
        removeConfig: (id) =>
          set((s) => ({
            configs: s.configs.filter((c) => c.id !== id),
            // also cleanup any data buffer for this config
            data: Object.fromEntries(
              Object.entries(s.data).filter(([k]) => k !== id)
            ),
          })),
        clearConfigs: () => set({ configs: [], data: {} }),

        // ---- Data buffers ----
        data: {},
        bufferSize: 500, // cap per graph
        setBufferSize: (n) =>
          set({ bufferSize: Math.max(50, Math.min(5000, n)) }),

        // `row` is series values keyed by line.label; we add timestamp automatically
        pushData: (configId, row) => {
          const ts = Date.now();
          const entry: GraphRow = { timestamp: ts, ...row };
          const { data, bufferSize } = get();
          const existing = data[configId] ?? [];
          const next =
            existing.length >= bufferSize
              ? [...existing.slice(existing.length - bufferSize + 1), entry]
              : [...existing, entry];
          set({ data: { ...data, [configId]: next } });
        },

        clearData: (configId) => {
          if (!configId) return set({ data: {} });
          const copy = { ...get().data };
          delete copy[configId];
          set({ data: copy });
        },

        // ---- Global layout / behavior ----
        numGraphs: 1,
        setNumGraphs: (n) =>
          set({ numGraphs: Math.max(0, Math.min(32, Math.floor(n))) }),

        axis: DEFAULT_AXIS,
        setAxis: (next) =>
          set((s) => ({
            axis:
              typeof next === "object" && "fixed" in next
                ? (next as AxisSettings)
                : { ...s.axis, ...(next as Partial<AxisSettings>) },
          })),

        display: DEFAULT_DISPLAY,
        setDisplay: (next) =>
          set((s) => ({
            display:
              typeof next === "object" && "useBar" in next
                ? (next as DisplaySettings)
                : { ...s.display, ...(next as Partial<DisplaySettings>) },
          })),
      }),
      {
        name: "graph-store", // localStorage key
        partialize: (s) => ({
          // persist only user-facing prefs + configs;
          // omit live data buffers unless you want them persisted too.
          configs: s.configs,
          numGraphs: s.numGraphs,
          axis: s.axis,
          display: s.display,
          bufferSize: s.bufferSize,
          // data: s.data, // (opt-in) uncomment to persist time series across reloads
        }),
      }
    )
  )
);
