// src/store/useGraphStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";


const sliceEnd = <T,>(arr: T[], max: number): T[] =>
  arr.length > max ? arr.slice(arr.length - max) : arr;

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
  sourceKey?: string;    
  lines: GraphLine[];
  waveforms?: number;
}

// One row of time series data per graph:
export type GraphRow = {
  timestamp: number; // ms since epoch (auto-added on push)
} & Record<string, number>; // series values keyed by line.label

// ----- Extra global settings  -----
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
  smooth: boolean;  // for line charts
  height: number;   // px per chart panel
  widthPct: number; // width percentage (for ResponsiveContainer)
  primaryColor: string; // default color for first series
  palette?: string[];
};

// First declare this — we'll reference it below
export type WaveformAssignments = Record<number, number[]>; // { [graphIdx]: [w1, w2, ...] }

// ----- GraphConfig UI defaults (new) -----
// Helps GraphConfig page: default 1 graph per char & auto-select all waveforms.
export type GraphUiSettings = {
  defaultGraphsPerChar: number;                 // default "graphs to open" per characteristic
  autoSelectAll: boolean;                       // auto-check all by default
  waveformSelections: Record<string, WaveformAssignments>; // uuid -> graphIdx -> waveforms
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
  pushMany: (batches: Record<string, GraphRow[]>) => void;

  // pushData: (configId: string, row: Record<string, number>) => void;
  pushData: (id: string, row: GraphRow) => void,
  clearData: (configId?: string) => void;

  // Global layout / behavior
  numGraphs: number;
  setNumGraphs: (n: number) => void;

  axis: AxisSettings;
  setAxis: (next: Partial<AxisSettings>) => void;

  display: DisplaySettings;
  setDisplay: (next: Partial<DisplaySettings>) => void;

  // GraphConfig page defaults
  graphUi: GraphUiSettings;
  setGraphUi: (next: Partial<GraphUiSettings>) => void;

  // Per-char waveform selection persistence
  setWaveformSelection: (uuid: string, assignments: WaveformAssignments) => void;
  clearWaveformSelection: (uuid: string) => void;

  // Hydration status for gating UI until persisted state loads
  _hasHydrated: boolean;
  _setHasHydrated: (v: boolean) => void;
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
  // Tailwind-ish palette (works on light/dark)
  palette: [
    "#3b82f6", // blue-500
    "#ef4444", // red-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#8b5cf6", // violet-500
    "#06b6d4", // cyan-500
    "#f97316", // orange-500
    "#22c55e", // green-500
    "#e11d48", // rose-600
    "#14b8a6", // teal-500
  ],
};

const DEFAULT_GRAPH_UI: GraphUiSettings = {
  defaultGraphsPerChar: 1, // you wanted "by default 1 graph"
  autoSelectAll: true,     // and "check all radio buttons" by default
  waveformSelections: {},
};

export const useGraphStore = create<GraphStore>()(
  devtools(
    persist(
      (set, get) => ({
        // ---- Configs ----
        configs: [],
        addConfig: (cfg) => set((s) => ({ configs: [...s.configs, cfg] })),
        removeConfig: (id) =>
          set((s) => ({
            configs: s.configs.filter((c) => c.id !== id),
            // also cleanup any data buffer for this config
            data: Object.fromEntries(Object.entries(s.data).filter(([k]) => k !== id)),
          })),
        clearConfigs: () => set({ configs: [], data: {} }),

        // ---- Data buffers ----
        data: {},
        bufferSize: 10, // cap per graph
        setBufferSize: (n) =>
          set({ bufferSize: Math.max(10, Math.min(50000, Math.floor(n))) }),

        // Keep the impl the same, but typed to GraphRow:
        pushData: (id, row) => set((s) => {
          const prev = s.data[id] ?? [];
          const next = [...prev, row];
          if (next.length > s.bufferSize) next.splice(0, next.length - s.bufferSize);
          return { data: { ...s.data, [id]: next } };
        }),

        pushMany: (batches) => {
          const max = get().bufferSize;
          const merged: Record<string, GraphRow[]> = { ...get().data };
          for (const [id, rows] of Object.entries(batches)) {
            if (!rows || rows.length === 0) continue;
            const prev = merged[id] ?? [];
            // Assume 'rows' are already in ascending time order; if not, sort by timestamp once before concat.
            let next = prev.concat(rows);
            next = sliceEnd(next, max);
            merged[id] = next;
          }
          set({ data: merged });
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
          set({ numGraphs: Math.max(0, Math.min(12, Math.floor(n))) }), // allow up to 12

        axis: DEFAULT_AXIS,
        setAxis: (next) =>
          set((s) => ({ axis: { ...s.axis, ...next } })),

        display: DEFAULT_DISPLAY,
        setDisplay: (next) =>
          set((s) => ({ display: { ...s.display, ...next } })),

        // ---- GraphConfig UI defaults (new) ----
        graphUi: DEFAULT_GRAPH_UI,
        setGraphUi: (next) =>
          set((s) => ({ graphUi: { ...s.graphUi, ...next } })),

        // ---- Per-char waveform selections ----
        setWaveformSelection: (uuid, assignments) =>
          set((s) => ({
            graphUi: {
              ...s.graphUi,
              waveformSelections: {
                ...s.graphUi.waveformSelections,
                [uuid]: assignments,
              },
            },
          })),

        clearWaveformSelection: (uuid) =>
          set((s) => {
            const next = { ...s.graphUi.waveformSelections };
            delete next[uuid];
            return { graphUi: { ...s.graphUi, waveformSelections: next } };
          }),

        // ---- Hydration flag (new) ----
        _hasHydrated: false,
        _setHasHydrated: (v: boolean) => set({ _hasHydrated: v }),
      }),
      {
        name: "graph-store", // localStorage key
        version: 2,          // bump version since we added new fields
        partialize: (s) => ({
          // persist only user-facing prefs + configs
          configs: s.configs,
          numGraphs: s.numGraphs,
          axis: s.axis,
          display: s.display,
          bufferSize: s.bufferSize,
          graphUi: s.graphUi,
          // data: s.data, // (opt-in) uncomment to persist time series across reloads
        }),
        // mark hydrated once rehydration completes
        onRehydrateStorage: () => (state, error) => {
          try { state?._setHasHydrated(true); } catch {}
          if (error) {
            try { state?._setHasHydrated(true); } catch {}
          }
        },
      }
    )
  )
);

// Optional: force rehydrate for some setups
// @ts-ignore
(useGraphStore as any).persist?.rehydrate?.();