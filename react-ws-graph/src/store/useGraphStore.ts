// // src/store/useGraphStore.ts
// import { create } from "zustand";
// import { devtools, persist } from "zustand/middleware";

// // ----- Types that match your current GraphConfigPage + BleConfig -----
// export type LineDef = {
//   label: string;                 // e.g. "Heart Rate"
//   byteIndex: string | number;    // e.g. "hr" or 1 (used to pick value from JSON)
// };
// export interface GraphLine {
//   label: string;
//   byteIndex: string | number;
// }

// export interface GraphConfigItem {
//   id: string;
//   title: string;
//   sourceUUID: string;
//   lines: GraphLine[];
//   waveforms?: number; // <-- add this
// }

// // One row of time series data per graph:
// export type GraphRow = {
//   timestamp: number;             // ms since epoch (auto-added on push)
// } & Record<string, number>;      // series values keyed by line.label

// // ----- Extra global settings you requested -----
// export type AxisSettings = {
//   fixed: boolean;
//   min: number;
//   max: number;
//   tickCount?: number;
// };

// export type DisplaySettings = {
//   useBar: boolean;
//   showGrid: boolean;
//   showLegend: boolean;
//   smooth: boolean;               // for line charts
//   height: number;                // px per chart panel
//   widthPct: number;              // width percentage (for ResponsiveContainer)
//   primaryColor: string;          // default color for first series
//   palette?: string[]; //
// };


// // ----- Store shape -----
// type GraphStore = {
//   // Graph configs
//   configs: GraphConfigItem[];
//   addConfig: (cfg: GraphConfigItem) => void;
//   removeConfig: (id: string) => void;
//   clearConfigs: () => void;

//   // Live data per config (rolling buffer)
//   data: Record<string, GraphRow[]>;
//   bufferSize: number;
//   setBufferSize: (n: number) => void;
//   pushData: (configId: string, row: Record<string, number>) => void;
//   clearData: (configId?: string) => void;

//   // Global layout / behavior
//   numGraphs: number;
//   setNumGraphs: (n: number) => void;

//   axis: AxisSettings;
//   setAxis: (next: Partial<AxisSettings> | AxisSettings) => void;

//   display: DisplaySettings;
//   setDisplay: (next: Partial<DisplaySettings> | DisplaySettings) => void;
// };

// // ----- Defaults -----
// const DEFAULT_AXIS: AxisSettings = {
//   fixed: false,
//   min: -100,
//   max: 100,
//   tickCount: 5,
// };

// const DEFAULT_DISPLAY: DisplaySettings = {
//   useBar: false,
//   showGrid: true,
//   showLegend: true,
//   smooth: true,
//   height: 280,
//   widthPct: 100,
//   primaryColor: "#3b82f6", // Tailwind blue-500
//   // Tailwind-ish palette (works on light/dark)
//   palette: [
//     "#3b82f6", // blue-500
//     "#ef4444", // red-500
//     "#10b981", // emerald-500
//     "#f59e0b", // amber-500
//     "#8b5cf6", // violet-500
//     "#06b6d4", // cyan-500
//     "#f97316", // orange-500
//     "#22c55e", // green-500
//     "#e11d48", // rose-600
//     "#14b8a6", // teal-500
//   ],
// };

// export const useGraphStore = create<GraphStore>()(
//   devtools(
//     persist(
//       (set, get) => ({
//         // ---- Configs ----
//         configs: [],
//         addConfig: (cfg) =>
//           set((s) => ({ configs: [...s.configs, cfg] })),
//         removeConfig: (id) =>
//           set((s) => ({
//             configs: s.configs.filter((c) => c.id !== id),
//             // also cleanup any data buffer for this config
//             data: Object.fromEntries(
//               Object.entries(s.data).filter(([k]) => k !== id)
//             ),
//           })),
//         clearConfigs: () => set({ configs: [], data: {} }),

//         // ---- Data buffers ----
//         data: {},
//         bufferSize: 500, // cap per graph
//         setBufferSize: (n) =>
//           set({ bufferSize: Math.max(50, Math.min(5000, n)) }),

//         // `row` is series values keyed by line.label; we add timestamp automatically
//         pushData: (configId, row) => {
//           const ts = Date.now();
//           const entry: GraphRow = { timestamp: ts, ...row };
//           const { data, bufferSize } = get();
//           const existing = data[configId] ?? [];
//           const next =
//             existing.length >= bufferSize
//               ? [...existing.slice(existing.length - bufferSize + 1), entry]
//               : [...existing, entry];
//           set({ data: { ...data, [configId]: next } });
//         },

//         clearData: (configId) => {
//           if (!configId) return set({ data: {} });
//           const copy = { ...get().data };
//           delete copy[configId];
//           set({ data: copy });
//         },

//         // ---- Global layout / behavior ----
//         numGraphs: 1,
//         setNumGraphs: (n) =>
//           set({ numGraphs: Math.max(0, Math.min(32, Math.floor(n))) }),

//         axis: DEFAULT_AXIS,
//         setAxis: (next) =>
//           set((s) => ({
//             axis:
//               typeof next === "object" && "fixed" in next
//                 ? (next as AxisSettings)
//                 : { ...s.axis, ...(next as Partial<AxisSettings>) },
//           })),

//         display: DEFAULT_DISPLAY,
//         setDisplay: (next) =>
//           set((s) => ({
//             display:
//               typeof next === "object" && "useBar" in next
//                 ? (next as DisplaySettings)
//                 : { ...s.display, ...(next as Partial<DisplaySettings>) },
//           })),
//       }),
//       {
//         name: "graph-store", // localStorage key
//         partialize: (s) => ({
//           // persist only user-facing prefs + configs;
//           // omit live data buffers unless you want them persisted too.
//           configs: s.configs,
//           numGraphs: s.numGraphs,
//           axis: s.axis,
//           display: s.display,
//           bufferSize: s.bufferSize,
//           //data: s.data, // (opt-in) uncomment to persist time series across reloads
//         }),
//       }
//     )
//   )
// );



import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

/** A single line/series within a graph */
export type LineDef = {
  label: string;
  byteIndex: number | string;
};

/** A single graph configuration */
export interface GraphConfig {
  id: string;
  title: string;
  sourceUUID: string;
  lines: LineDef[];
}

/** One row in Recharts dataset */
export type GraphRow = {
  timestamp: number;
  // dynamic series keys by label => number
  [seriesLabel: string]: number;
};

type AxisState = {
  fixed: boolean;
  min: number;
  max: number;
  tickCount?: number;
};

type DisplayState = {
  useBar: boolean;
  smooth: boolean;
  showLegend: boolean;
  showGrid: boolean;
  height: number;      // px
  widthPct: number;    // %
  palette?: string[];
};

type GraphStore = {
  // configs & data
  configs: GraphConfig[];
  data: Record<string, GraphRow[]>; // by config.id

  // layout / look
  numGraphs: number;         // columns
  axis: AxisState;
  display: DisplayState;

  // NEW: x-axis buffer size (points kept per graph)
  bufferSize: number;

  // actions
  addConfig: (cfg: GraphConfig) => void;
  removeConfig: (cfgId: string) => void;
  clearConfigs: () => void;

  pushData: (cfgId: string, row: Partial<GraphRow>) => void;
  setNumGraphs: (n: number) => void;
  setAxis: (a: AxisState) => void;
  setDisplay: (d: DisplayState) => void;
  setBufferSize: (n: number) => void;
};

const DEFAULT_AXIS: AxisState = {
  fixed: false,
  min: 0,
  max: 100,
  tickCount: 5,
};

const DEFAULT_DISPLAY: DisplayState = {
  useBar: false,
  smooth: false,
  showLegend: true,
  showGrid: true,
  height: 240,
  widthPct: 100,
  palette: ['#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#eab308', '#06b6d4'],
};

export const useGraphStore = create<GraphStore>()(
  devtools(
    persist(
      (set, get) => ({
        configs: [],
        data: {},

        // Default columns: 1 (as requested)
        numGraphs: 1,

        axis: DEFAULT_AXIS,
        display: DEFAULT_DISPLAY,

        // Default buffer: 500 points per graph (adjust any time)
        bufferSize: 500,

        addConfig: (cfg) =>
          set((s) => ({
            configs: [...s.configs, cfg],
            data: { ...s.data, [cfg.id]: s.data[cfg.id] ?? [] },
          })),

        removeConfig: (cfgId) =>
          set((s) => {
            const { [cfgId]: _, ...rest } = s.data;
            return {
              configs: s.configs.filter((c) => c.id !== cfgId),
              data: rest,
            };
          }),

        clearConfigs: () => set({ configs: [], data: {} }),

        pushData: (cfgId, partial) => {
          if (!partial) return;
          const ts = (partial.timestamp ?? Date.now()) as number;

          set((s) => {
            const current = s.data[cfgId] ?? [];
            // Create a shallow row with timestamp + provided keys
            const row: GraphRow = { timestamp: ts, ...partial } as GraphRow;
            const next = [...current, row];

            const max = Math.max(1, s.bufferSize);
            if (next.length > max) next.splice(0, next.length - max);

            return { data: { ...s.data, [cfgId]: next } };
          });
        },

        setNumGraphs: (n) => set({ numGraphs: Math.max(1, Math.min(4, Math.floor(n) || 1)) }),
        setAxis: (a) => set({ axis: { ...a } }),
        setDisplay: (d) => set({ display: { ...d } }),

        setBufferSize: (n) =>
          set((s) => {
            const max = Math.max(1, Math.floor(n) || 1);
            // Trim all existing series to new buffer immediately
            const trimmed: Record<string, GraphRow[]> = {};
            for (const [id, rows] of Object.entries(s.data)) {
              trimmed[id] = rows.length > max ? rows.slice(-max) : rows.slice();
            }
            return { bufferSize: max, data: trimmed };
          }),
      }),
      {
        name: "graph-store-v1", // localStorage key
        version: 1,
        // You can choose which keys to persist; we keep everything
      }
    )
  )
);
