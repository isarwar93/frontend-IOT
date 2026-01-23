import { create} from "zustand";


// --- For websocket data ----
type ChannelBuffer = {
  name: string;
  buffer: Float32Array;
  head: number;
  min: number;
  max: number;
  avg: number;
  updated: boolean;
};

type DataStore = {
  channels: ChannelBuffer[];
  setChannels: (chs: ChannelBuffer[]) => void;
  updateHead: (name: string, newHead: number) => void;
  updateMinMaxAvg: (name: string, max: number, min: number, avg: number) => void;
  updated: (name: string, updated: boolean) => void;
};

export const useDataStore = create<DataStore>((set) => ({
  channels: [],
  setChannels: (chs) => set({ channels: chs }),
  updateHead: (name, newHead) =>
    set((state) => ({
      channels: state.channels.map((c) =>
        c.name === name ? { ...c, head: newHead } : c
      ),
    })),
  updateMinMaxAvg: (name, max, min, avg) =>
    set((state) => ({
      channels: state.channels.map((c) =>
        c.name === name ? { ...c, max, min, avg } : c
      ),
    })),
  updated: (name, updated) =>
    set((state) => ({
      channels: state.channels.map((c) =>
        c.name === name ? { ...c, updated } : c
      ),
    })),
}));

// --- For top bar connection related ----
export type BlePhase =
  | "disconnecting"
  | "disconnected" 
  | "scanning"
  | "NotFound"
  | "connecting"
  | "connected"
  | "error";

export type GraphPhase =
  | "stopped"
  | "scanning"
  | "starting"
  | "starting websocket"
  | "running"
  | "stopping"
  | "error";


type MedicalState = {
  blePhase: BlePhase;
  graphPhase: GraphPhase;
  lastGet: unknown | null;
  lastPost: unknown | null;
  lastWsMsg: string | null;
  error: string | null;
  medicalBufferSize: number;

  setBlePhase: (p: BlePhase) => void;
  setGraphPhase: (s: GraphPhase) => void;
  setLastGet: (v: unknown) => void;
  setLastPost: (v: unknown) => void;
  setLastWsMsg: (v: string) => void;
  setError: (e: string | null) => void;
  setMedicalBufferSize: (size: number) => void;
  reset: () => void;
};

export const useMedicalStore = create<MedicalState>((set) => ({
  blePhase: "disconnected",
  graphPhase: "stopped",
  lastGet: null,
  lastPost: null,
  lastWsMsg: null,
  error: null,
  medicalBufferSize: 2048,

  setBlePhase: (blePhase) => set({ blePhase }),
  setGraphPhase: (graphPhase) => set({ graphPhase }),
  setLastGet: (lastGet) => set({ lastGet }),
  setLastPost: (lastPost) => set({ lastPost }),
  setLastWsMsg: (lastWsMsg) => set({ lastWsMsg }),
  setError: (error) => set({ error }),
  setMedicalBufferSize: (medicalBufferSize) => set({ medicalBufferSize }),
  reset: () =>
    set({
      blePhase: "disconnected",
      graphPhase: "stopped",
      lastGet: null,
      lastPost: null,
      lastWsMsg: null,
      error: null,
    }),
}));
