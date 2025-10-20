

// src/lib/websocket.ts
// type Frame = { id:string; t: number; v: number };
type Frame = { t: number; v: number };
type Listener = () => void;

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

export function connectWebSocket(url: string) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return ws;
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