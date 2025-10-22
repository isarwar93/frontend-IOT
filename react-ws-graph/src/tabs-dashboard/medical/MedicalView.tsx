// src/tabs-dashboard/medical/Medical.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import { useTheme } from "next-themes";
import { useGraphStore } from "@/store/useGraphStore";
import { useBLEStore } from "@/store/useBLEStore";
import MedTopBar  from "./MedTopBar";

import FastLineCanvas from "./FastLineCanvas";
import { connectWebSocket, disconnectWebSocket } from "./MedWebSocket";
import { useLiveSeries } from "./useLiveSeries";
import {WS_BASE, WSKey } from "./MedComm";
import { useMedicalStore } from "../../store/useMedicalStore";
// Parse only: { id: "Characteristic <name>.<idx>", time, value }
type ParsedNameFrame = { t: number; value: number; baseName: string; chanIdx: number };

function parseNamedFrame(raw: string): ParsedNameFrame | null {
  try {
    const msg = JSON.parse(raw);
    const value = Number(msg?.value);
    if (!Number.isFinite(value)) return null;

    let t = Date.now();
    if (typeof msg?.time === "number") t = msg.time;
    else if (typeof msg?.time === "string") t = Number(msg.time);
    if (!Number.isFinite(t)) return null;

    if (typeof msg?.id !== "string") return null;
    const idStr = msg.id.trim();

    // Accept:
    //  "Characteristic <name>.<idx>"
    //  "Characteristic <name> [<idx>]"
    //  "<name>.<idx>"
    //  "<name> [<idx>]"
    let m =
      /^Characteristic\s+(.+?)(?:[.\[]\s*(\d+)\s*\]?)?$/.exec(idStr) ||
      /^(.+?)(?:[.\[]\s*(\d+)\s*\]?)?$/.exec(idStr);
    if (!m) return null;

    const baseName = (m[1] ?? "").trim();
    const chanIdx = m[2] ? Number(m[2]) : 1;
    if (!baseName || !Number.isFinite(chanIdx) || chanIdx < 1) return null;

    return { t, value, baseName, chanIdx };
  } catch {
    return null;
  }
}

const macHex = (s: string | undefined) =>
  (s ?? "").replace(/[^a-fA-F0-9]/g, "").toLowerCase();

const normalizeName = (s: string) =>
  s.replace(/^Characteristic\s+/i, "").trim().replace(/\s+/g, " ").toLowerCase();

const baseFromLabel = (lbl: string) => {
  // "Custom [0]" -> "Custom"
  const m = /^(.+?)\s*\[\d+\]\s*$/.exec(lbl.trim());
  return normalizeName(m ? m[1] : lbl);
};


// const WS_BASE = import.meta.env.VITE_API_BASE_URL_WS ?? "";
const buildURL = (mac: string) =>
  `${WS_BASE}/ws/ble/graph/mac=${encodeURIComponent(mac)}`;

const idxFromLine = (ln: { byteIndex: string | number; label: string }): number | null => {
  const n = Number(ln.byteIndex);
  if (Number.isFinite(n)) return n;                 // explicit numeric mapping wins
  const m = /\[(\d+)\]\s*$/.exec(String(ln.label)); // label suffix "[n]"
  return m ? Number(m[1]) : null;
};

export const Medical: React.FC = () => {
  const {
    configs,
    data,
    pushMany,
    axis,
    display,
    numGraphs,
  } = useGraphStore();
    const containerRef = useRef<HTMLDivElement | null>(null);
const {  blePhase, graphPhase,lastWsMsg} = useMedicalStore();
//  const {} = useMedicalStore();
  // Listen for global start/stop from StreamControlBar
  // useEffect(() => {
  //   const onStart = () => connectAll();
  //   const onStop  = () => disconnectAll();
  //   window.addEventListener("graph:start", onStart);
  //   window.addEventListener("graph:stop", onStop);
  //   return () => {
  //     window.removeEventListener("graph:start", onStart);
  //     window.removeEventListener("graph:stop", onStop);
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // const hasHydrated = useGraphStore((s) => s._hasHydrated);
  // if (!hasHydrated) {
  //   return <div className="p-4 text-sm text-muted-foreground">Loading graphs…</div>;
  // }

  const { connectedDevices } = useBLEStore();
  const deviceMac = useMemo(
    () => (connectedDevices?.[0]?.mac) || "",
    [connectedDevices]
  );


const [isConnected, setIsConnected] = useState(false);

const socketsRef = useRef<Record<WSKey, WebSocket>>({});
type Row = { timestamp: number } & Record<string, number>;
  const pendingRef = useRef<Record<string, Row[]>>({});
  const flushTimerRef = useRef<number | null>(null);
  const FLUSH_MS = 80; // ~12.5 fps is smooth

// Map: "<normalizedBaseName>|<idx0>|<macHex>" -> Target[]
const routeByNameChan = useMemo(() => {
  type Target = { cfgId: string; label: string; macHex?: string };
  const map = new Map<string, Target[]>();

  const add = (name: string, idx0: number, macH: string, t: Target) => {
    const k = `${normalizeName(name)}|${idx0}|${macH}`;
    const arr = map.get(k) ?? [];
    if (!arr.some(x => x.cfgId === t.cfgId && x.label === t.label)) arr.push(t);
    map.set(k, arr);
  };

  for (const cfg of configs) {
    const macRaw = String((cfg as any)?.sourceKey ?? "").split("|")[0] ?? "";
    const macH = macHex(macRaw);

    // Which base-names do we associate with this config?
    const names = new Set<string>();
    const title = String(cfg.title ?? "").split("—")[0].trim();
    if (title) names.add(title);
    const srcLabel = String((cfg as any)?.sourceLabel ?? "").trim();
    if (srcLabel) names.add(srcLabel);
    for (const ln of cfg.lines ?? []) names.add(baseFromLabel(String(ln.label ?? "")));

    // Map each line to its channel index
    for (const ln of cfg.lines ?? []) {
      const idx0 = idxFromLine(ln as any);
      if (idx0 == null) continue;
      for (const nm of names) {
        add(nm, idx0, macH, { cfgId: cfg.id, label: ln.label, macHex: macH });
      }
    }
  }
  return map;
}, [configs]);

const scheduleFlush = () => {
  if (flushTimerRef.current != null) return;
  flushTimerRef.current = window.setTimeout(() => {
    flushTimerRef.current = null;
    const batches = pendingRef.current;
    pendingRef.current = {};
    if (Object.keys(batches).length === 0) return;
    // Coalesce rows per cfgId by timestamp so sparse series align nicely
    const coalesced: Record<string, Row[]> = {};
    for (const [cfgId, arr] of Object.entries(batches)) {
      const byTs = new Map<number, Row>();
      for (const r of arr) {
        const prev = byTs.get(r.timestamp) ?? { timestamp: r.timestamp };
        Object.assign(prev, r);
        byTs.set(r.timestamp, prev);
      }
      coalesced[cfgId] = Array.from(byTs.values());
    }
    // console.log("Graph pushMany", coalesced);
    pushMany(coalesced);
  }, FLUSH_MS);
};

  const recomputeConnected = (pool: Record<WSKey, WebSocket>) => {
    const anyOpen = Object.values(pool).some((x) => x.readyState === WebSocket.OPEN);
    setIsConnected(anyOpen);
    window.dispatchEvent(new CustomEvent("graph:state", { detail: { running: anyOpen } }));
  };

  const connectAll = () => {
    if (!deviceMac) return;
    const created: Record<WSKey, WebSocket> = { ...socketsRef.current };

    const key: WSKey = deviceMac;               // one socket per MAC
    if (created[key] && created[key].readyState === WebSocket.OPEN) return;

    const safeMac = deviceMac.replace(/:/g, "_");
    const url = `${WS_BASE}/ws/ble/graph/mac=${encodeURIComponent(safeMac)}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      created[key] = ws;
      socketsRef.current = { ...created };
      recomputeConnected(created);
    };

    ws.onmessage = (ev) => {
      const pf = parseNamedFrame(ev.data);
      if (!pf) return;

      const idx0 = Math.max(0, pf.chanIdx - 1);
      const devMacH = macHex(deviceMac);
      const k = `${normalizeName(pf.baseName)}|${idx0}|${devMacH}`;
      const targets = routeByNameChan.get(k);

      if (targets && targets.length) {
        for (const t of targets) {
          // (macHex already part of the key, this is just extra safety)
          if (t.macHex && devMacH && t.macHex !== devMacH) continue;
          (pendingRef.current[t.cfgId] ??= []).push({ timestamp: pf.t, [t.label]: pf.value });
        }
        scheduleFlush();
        return;
      }

      // console.warn("Unroutable frame", { base: pf.baseName, idx0, mac: deviceMac });
    };

    
    ws.onerror = () => { console.warn("WS error", key); };
    ws.onclose = () => {
      delete created[key];
      socketsRef.current = { ...created };
      recomputeConnected(created);
    };

    created[key] = ws;
    socketsRef.current = created;
    recomputeConnected(created);
  };

  const disconnectAll = () => {
    const cur = socketsRef.current;
    Object.values(cur).forEach((ws) => { try { ws.close(); } catch {} });
    socketsRef.current = {};
    setIsConnected(false);

    window.dispatchEvent(new CustomEvent("graph:state", { detail: { running: false } }));
    // Clear pending + timer
    pendingRef.current = {};
    if (flushTimerRef.current != null) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  };

  // const { times, values, head, len, cap } = useLiveSeries();

  useEffect(() => {
    console.log("graphPhase",graphPhase);
    if (graphPhase !== "running"){
      return;
    }
      if (!deviceMac) return;
      connectWebSocket(buildURL(deviceMac));
      return () => disconnectWebSocket();
  }, [graphPhase]);

  // Optional: derived FPS/latency debug (cheap, memoized)
  // const stats = useMemo(() => ({ points: len }), [len]);
 
  useEffect(() => {
    return () => { disconnectAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Layout helpers (avoid dynamic Tailwind class names) ---
  const gridColsClass = useMemo(() => {
    const cols = Math.max(1, Math.min(4, numGraphs || configs.length || 1));
    const map: Record<number, string> = {
      1: "md:grid-cols-1",
      2: "md:grid-cols-2",
      3: "md:grid-cols-3",
      4: "md:grid-cols-4",
    };
    return `grid grid-cols-1 ${map[cols]} gap-4`;
  }, [numGraphs, configs.length]);

  // To create simulated value for graphValues
  const valueSimulate = () => {
    let valueNumber: number = 0;
    valueNumber = Math.floor(Math.random() * (120 - 60 + 1)) + 60;
    return valueNumber;
  }
  const [simulatedValue, setSimulatedValue] = useState<string[]>(["0","0","0"]);
  // Continues update of simulated value for graphValues
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedValue([String(valueSimulate()),String(valueSimulate()),String(valueSimulate())]);
    }, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);  



  // const values = useMemo(() => {
  //   const values: number[] = [];
  //   for (let i = 0; i < 300; i++) {
  //     values.push(valueSimulate());
  //   } 
  //   return values;
  // }

  // --- Axis helpers ---
  const yDomain: [number | "auto", number | "auto"] = axis.fixed
    ? [axis.min, axis.max]
    : ["auto", "auto"];
  return (
    <div className="space-y-1">
      <MedTopBar />
      <div
       ref={containerRef}
       className={`rounded-t-md p-1 flex flex-wrap`}
       style={{ width: "100%", height: "540px" }}
      >
      <div
        className=" rounded-tl-md p-1 border gap-0.5 border-b-0 border-r-0"
        style={{width:"70%",height:"400px"}}  
      >
        <FastLineCanvas  
                        theme={useTheme().theme==="dark"?"dark":"light"}
                        simulate 
                        numSeries={1}
                        cap={4096}
                        sampleInterval={100}
                        maxPoints={300}
                        lineColors={["#afa22bff"]}
                        graphTitle="ECG"
                        graphUnit="bpm"
                        graphValue={simulatedValue[0]}
        />
        
        <FastLineCanvas theme={useTheme().theme==="dark"?"dark":"light"}
                        simulate 
                        numSeries={1}
                        cap={4096}
                        sampleInterval={100}
                        maxPoints={300}
                        lineColors={["#2faf2bff"]}
                        graphTitle="Pulse"
                        graphUnit="bpm"
                        graphValue={simulatedValue[1]}
        />
        <FastLineCanvas theme={useTheme().theme==="dark"?"dark":"light"}
                        simulate 
                        numSeries={1}
                        cap={4096}
                        sampleInterval={100}
                        maxPoints={300}
                        lineColors={["#2bafafff"]}
                        graphTitle="Resp"
                        graphUnit="bpm"
                        graphValue={simulatedValue[2]}
        />
      </div>
       <div
        className="rounded-tr-md border border-b-0"
        style={{width:"30%",height:"400px"}}  


      ></div>

       <div
       // we want to it start again from next line 
       className="rounded-b-md border"
       style={{width:"100%",height:"140px"}}
      > 
      </div>


      </div>
    </div>
  );
};

export default Medical;