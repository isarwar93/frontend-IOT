// src/lib/websocket.ts
import { useDataStore } from "./useMedicalStore";


type WSKey = string; // `${mac}`
const WS_BASE = import.meta.env.VITE_API_BASE_URL_WS ?? "";
const HTTP_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

//TODO: Later Medical config, to set MAC address and characteristics to monitor
const MAC=import.meta.env.VITE_API_BASE_MAC|| "";


type Frame = { t: number; v: number };
type Listener = () => void;


type Channel = {
  name: string;
  buffer: Float32Array;
  head: number;
};

let channels: Channel[] = [];
let timer: (NodeJS.Timeout | null)[] = [];

export function initChannels(names: string[], size = 1024) {
  channels = names.map((name) => ({
    name,
    buffer: new Float32Array(size),
    head: 0,
  }));

  // Register references in Zustand (React can read them)
  useDataStore.getState().setChannels(channels);
}

export function addValue(name: string, value: number) {
  const ch = channels.find((c) => c.name === name);
  if (!ch) return;

  const idx = ch.head % ch.buffer.length;
  ch.buffer[idx] = value;
  ch.head++;

  useDataStore.getState().updateHead(name, ch.head);
}
export function startTimer(interval = 5000) {
  for(let i = 0;i<3;i++){
    if (timer[i]) 
      return;
  }
  if (channels.length === 0)
    initChannels(["sensorA", "sensorB", "sensorC"], 500);

  timer[0] = setInterval(() => {
    const t = Date.now() / 1000;
    addValue("sensorA", Math.sin(t));
  }, interval);

  timer[1] = setInterval(() => {
    const t = Date.now() / 1000;
    addValue("sensorB", Math.cos(t));
  }, interval+50);

  timer[2] = setInterval(() => {
    const t = Date.now() / 1000;
    addValue("sensorC", Math.sin(t * 0.5) + Math.random() * 0.9);
  }, interval + 50);
}

export function stopTimer() {
  for (let i = 0;i<3;i++){
    if (timer[i]) {
      clearInterval(timer[i]!);
      timer[i] = null;
    }
  }
}

export function getSnapshot(name: string): Float32Array | null {
  const ch = channels.find((c) => c.name === name);
  return ch ? ch.buffer.slice(0, Math.min(ch.head, ch.buffer.length)) : null;
}




class LiveBuffer {
  private cap: number;
  private times: Float64Array;
  private values: Float32Array;

  // Mutable counters (do NOT replace this object)
  private counters = { head: 0, len: 0 };

  // Version is a primitive that bumps on change
  private version = 0;

  // Stable arrays view (never reallocated)
  private arraysView: { times: Float64Array; values: Float32Array; cap: number };

  private listeners = new Set<Listener>();
  private scheduled = false;

  constructor(capacity = 20_000) {
    this.cap = capacity;
    this.times = new Float64Array(capacity);
    this.values = new Float32Array(capacity);
    this.arraysView = { times: this.times, values: this.values, cap: this.cap };
  }

  push(f: Frame) {
    const i = this.counters.head;
    this.times[i] = f.t;
    this.values[i] = f.v;
    this.counters.head = (i + 1) % this.cap;
    if (this.counters.len < this.cap) this.counters.len++;
  }

  // ----- snapshots / getters -----
  /** Primitive snapshot that MUST change when store changes */
  getVersion() {
    return this.version;
  }

  /** Stable reference (identity never changes) */
  getArrays() {
    return this.arraysView;
  }

  /** Small mutable struct (identity stable; values change) */
  getCounters() {
    return this.counters;
  }

  // ----- subscription -----
  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** RAF-batched notify + bump version exactly once per frame */
  scheduleNotify() {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      this.version++; // <- snapshot changes (primitive), triggers React
      for (const cb of this.listeners) cb();
    });
  }
}

const buffer = new LiveBuffer();

let ws: WebSocket | null = null;

export function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return ws;
  const key: WSKey = MAC; 

  const safeMac = key.replace(/:/g, "_");
  const url = `${WS_BASE}/ws/ble/graph/mac=${encodeURIComponent(safeMac)}`;
  
  ws = new WebSocket(url);
  ws.onmessage = (ev) => {
    try {
      const m = JSON.parse(typeof ev.data === "string" ? ev.data : "");
      const v = Number(m?.v ?? m?.value);
      if (!Number.isFinite(v)) return;

      let t: number;
      const mt = m?.t ?? m?.time;
      if (typeof mt === "number") t = mt;
      else if (typeof mt === "string") t = Number(mt);
      else t = performance.now();

      buffer.push({ t, v });
      buffer.scheduleNotify();
    } catch { /* ignore malformed frames */ }
  };
  return ws;
}

export function disconnectWebSocket() {
  try { ws?.close(); } catch {}
  ws = null;
}

// Expose store API to the hook
export const subscribeBuffer = (cb: () => void) => buffer.subscribe(cb);
export const getVersionSnapshot = () => buffer.getVersion();   // <- primitive
export const getArrays = () => buffer.getArrays();             // stable refs
export const getCounters = () => buffer.getCounters();         // stable object