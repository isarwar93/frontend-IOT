import { create } from 'zustand';

type LayoutConfig = {
  graphs: number;
  videos: number;
  fields: number;
};

type LayoutState = {
  config: LayoutConfig;
  setConfig: (config: LayoutConfig) => void;
};

export const useLayoutStore = create<LayoutState>((set) => ({
  config: { graphs: 1, videos: 1, fields: 1 },
  setConfig: (config) => set({ config }),
}));
