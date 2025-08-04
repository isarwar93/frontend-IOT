// src/store/useGraphStore.ts
import { create } from "zustand";

type GraphLine = {
  label: string;
  byteIndex: string | number;
  color?: string;
};

type GraphConfig = {
  id: string;
  title: string;
  sourceUUID: string;
  lines: GraphLine[];
};

type DataPoint = { timestamp: number; [key: string]: number };

type GraphStore = {
  configs: GraphConfig[];
  data: Record<string, DataPoint[]>;

  addConfig: (cfg: GraphConfig) => void;
  updateConfig: (id: string, cfg: Partial<GraphConfig>) => void;
  removeConfig: (id: string) => void;

  pushData: (id: string, values: Partial<Record<string, number>>) => void;
};

export const useGraphStore = create<GraphStore>((set) => ({
  configs: [],
  data: {},

  addConfig: (cfg) =>
    set((s) => ({ configs: [...s.configs, cfg], data: { ...s.data, [cfg.id]: [] } })),

  updateConfig: (id, cfg) =>
    set((s) => ({
      configs: s.configs.map((c) => (c.id === id ? { ...c, ...cfg } : c)),
    })),

  removeConfig: (id) =>
    set((s) => {
      const newConfigs = s.configs.filter((c) => c.id !== id);
      const { [id]: _, ...rest } = s.data;
      return { configs: newConfigs, data: rest };
    }),

  pushData: (id, values) =>
    set((s) => {
      const existing = s.data[id] || [];
      const newEntry = { timestamp: Date.now(), ...values };
      const maxLength = 100; // limit to 100 points
      return {
        data: {
          ...s.data,
          [id]: [...existing.slice(-maxLength + 1), newEntry],
        },
      };
    }),
}));
