import { create } from "zustand";

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
