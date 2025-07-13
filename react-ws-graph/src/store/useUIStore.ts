import { create } from 'zustand';

type Tab = 'graph' | 'video' |'analysis'|'chat';
type Section = 'dashboard' | 'settings' | 'config';
type ProtocolTab = 'ble' | 'mqtt' | 'usb';



interface Sensor {
  id: string;
  name: string;
  type: string;
  unit: string;
  graphWindow?: number;
  waveformIndex?: number;
}

interface UIState {
  loadConfig: (config: Partial<UIState>) => void;

  color: string;
  setColor: (val: string) => void;

  useBar: boolean;
  toggleUseBar: () => void;

  fixedYAxis: boolean;
  toggleFixedYAxis: () => void;

  minY: number;
  setMinY: (val: number) => void;

  maxY: number;
  setMaxY: (val: number) => void;

  bufferSize: number;
  setBufferSize: (val: number) => void;

  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  activeSection: Section;
  setActiveSection: (section: Section) => void;

  showFps: boolean;
  toggleFps: () => void;

  showGrid: boolean;
  toggleGrid: () => void;

  gridSize: number;
  setGridSize: (size: number) => void;

  showMin: boolean;
  toggleMin: () => void;

  showMax: boolean;
  toggleMax: () => void;

  showAvg: boolean;
  toggleAvg: () => void;

  showPoints: boolean;
  togglePoints: () => void;

  graphWidth: number;
  setGraphWidth: (val: number) => void;

  graphHeight: number;
  setGraphHeight: (val: number) => void;

  sensors: Sensor[];
  setSensors: (s: Sensor[]) => void;
  addSensor: (sensor: Sensor) => void;
  updateSensorAssignment: (id: string, updates: Partial<Sensor>) => void;

  username: string;
  setUsername: (name: string) => void;

  protocolTab: ProtocolTab;
  setProtocolTab: (tab: ProtocolTab) => void;


  
}

export const useUIStore = create<UIState>((set) => ({
  loadConfig: (config: Partial<UIState>) => set(config),

  color: "#6366f1",
  setColor: (val) => set({ color: val }),

  useBar: false,
  toggleUseBar: () => set((s) => ({ useBar: !s.useBar })),

  fixedYAxis: false,
  toggleFixedYAxis: () => set((s) => ({ fixedYAxis: !s.fixedYAxis })),

  minY: 0,
  setMinY: (val) => set({ minY: val }),

  maxY: 100,
  setMaxY: (val) => set({ maxY: val }),

  bufferSize: 100,
  setBufferSize: (val) => set({ bufferSize: val }),

  activeTab: 'graph',
  setActiveTab: (tab) => set({ activeTab: tab }),

  activeSection: 'dashboard',
  setActiveSection: (section) => set({ activeSection: section }),

  showFps: true,
  toggleFps: () => set((s) => ({ showFps: !s.showFps })),

  showGrid: true,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

  gridSize: 50,
  setGridSize: (size) => set({ gridSize: size }),

  showMin: true,
  toggleMin: () => set((s) => ({ showMin: !s.showMin })),

  showMax: true,
  toggleMax: () => set((s) => ({ showMax: !s.showMax })),

  showAvg: true,
  toggleAvg: () => set((s) => ({ showAvg: !s.showAvg })),

  showPoints: true,
  togglePoints: () => set((s) => ({ showPoints: !s.showPoints })),

  graphWidth: 100,
  setGraphWidth: (val) => set({ graphWidth: val }),

  graphHeight: 300,
  setGraphHeight: (val) => set({ graphHeight: val }),

  sensors: [],
  setSensors: (sensors) => set({ sensors }),

  addSensor: (sensor) => set((state) => ({
    sensors: [...state.sensors.filter((s) => s.id !== sensor.id), sensor],
  })),

  updateSensorAssignment: (id, updates) =>
    set((state) => ({
      sensors: state.sensors.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),


    username: "",
    setUsername: (name) => set({ username: name }),

  protocolTab: 'ble',
  setProtocolTab: (tab: ProtocolTab) => set({ protocolTab: tab }),

}));
