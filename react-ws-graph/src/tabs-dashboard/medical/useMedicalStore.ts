import { create} from "zustand";



type ChannelBuffer = {
  name: string;
  buffer: Float32Array;
  head: number;
};

type DataStore = {
  channels: ChannelBuffer[];
  setChannels: (chs: ChannelBuffer[]) => void;
  updateHead: (name: string, newHead: number) => void;
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
}));





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

  setBlePhase: (p: BlePhase) => void;
  setGraphPhase: (s: GraphPhase) => void;
  setLastGet: (v: unknown) => void;
  setLastPost: (v: unknown) => void;
  setLastWsMsg: (v: string) => void;
  setError: (e: string | null) => void;
  reset: () => void;
};

export const useMedicalStore = create<MedicalState>((set) => ({
  blePhase: "disconnected",
  graphPhase: "stopped",
  lastGet: null,
  lastPost: null,
  lastWsMsg: null,
  error: null,

  setBlePhase: (blePhase) => set({ blePhase }),
  setGraphPhase: (graphPhase) => set({ graphPhase }),
  setLastGet: (lastGet) => set({ lastGet }),
  setLastPost: (lastPost) => set({ lastPost }),
  setLastWsMsg: (lastWsMsg) => set({ lastWsMsg }),
  setError: (error) => set({ error }),
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
