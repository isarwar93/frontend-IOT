// src/store/useBLEStore.ts
import { create } from "zustand";

export interface BLEDevice {
  mac: string;
  name: string;
  rssi: number;
}

export type GattCharacteristic = {
  name: string;
  path: string;
  uuid: string;
  properties: string[];
};

export type GattService = {
  name: string;
  path: string;
  uuid: string;
  characteristics: GattCharacteristic[];
};

interface BLEStore {
  bleDevices: BLEDevice[];
  connectedDevices: BLEDevice[];
  gattMap: Record<string, GattService[]>;
  expandedDevices: Record<string, boolean>;
  connectionStatus: Record<string, string>;
  notifications: Record<string, boolean>;
  notifValues: Record<string, string>;
  writeValues: Record<string, string>;
  selectedChars: string[];
  isScanning: boolean;
  showScanned: boolean;
  showConnected: boolean;

  // Setters
  setBleDevices: (devices: BLEDevice[]) => void;
  setConnectedDevices: (devices: BLEDevice[]) => void;
  setGattMap: (map: Record<string, GattService[]>) => void;
  setExpandedDevices: (expanded: Record<string, boolean>) => void;
  setConnectionStatus: (status: Record<string, string>) => void;
  setNotifications: (map: Record<string, boolean>) => void;
  setNotifValues: (values: Record<string, string>) => void;
  setWriteValues: (values: Record<string, string>) => void;
  setSelectedChars: (ids: string[]) => void;
  setIsScanning: (v: boolean) => void;
  setShowScanned: (v: boolean) => void;
  setShowConnected: (v: boolean) => void;
}

export const useBLEStore = create<BLEStore>((set) => ({
  bleDevices: [],
  connectedDevices: [],
  gattMap: {},
  expandedDevices: {},
  connectionStatus: {},
  notifications: {},
  notifValues: {},
  writeValues: {},
  selectedChars: [],
  isScanning: false,
  showScanned: true,
  showConnected: false,

  setBleDevices: (d) => set({ bleDevices: d }),
  setConnectedDevices: (d) => set({ connectedDevices: d }),
  setGattMap: (map) => set({ gattMap: map }),
  setExpandedDevices: (expanded) => set({ expandedDevices: expanded }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setNotifications: (map) => set({ notifications: map }),
  setNotifValues: (v) => set({ notifValues: v }),
  setWriteValues: (v) => set({ writeValues: v }),
  setSelectedChars: (ids) => set({ selectedChars: ids }),
  setIsScanning: (v) => set({ isScanning: v }),
  setShowScanned: (v) => set({ showScanned: v }),
  setShowConnected: (v) => set({ showConnected: v }),
}));
