// src/components/GraphEngine.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import { useGraphStore } from "@/store/useGraphStore";
import { useBLEStore } from "@/store/useBLEStore";
import { Button } from "@/components/ui/Button";
import StreamControlBar from "@/components/StreamControlBar";

type WSKey = string; // `${mac}|${uuid}`
const WS_BASE = import.meta.env.VITE_API_BASE_URL_WS ?? "";

/** Parse backend frame like: { time, id: "n.m" | n.m, value } */
function parseBackendFrame(raw: string): {
  t: number; idInt: number; idFrac: number; value: number;
} | null {
  try {
    const msg = JSON.parse(raw);
    let t = Date.now();
    if (typeof msg?.time === "number") t = msg.time;
    else if (typeof msg?.time === "string") t = Number(msg.time);

    let idNum: number | null = null;
    if (typeof msg?.id === "number") idNum = msg.id;
    else if (typeof msg?.id === "string") idNum = Number(msg.id);

    const value =
      typeof msg?.value === "number"
        ? msg.value
        : (typeof msg?.value === "string" ? Number(msg.value) : NaN);

    if (!Number.isFinite(t) || !Number.isFinite(idNum as number) || !Number.isFinite(value)) {
      return null;
    }

    const idStr = String(idNum);
    const [intPartStr, fracPartStr = "0"] = idStr.split(".");
    const idInt = Number(intPartStr);
    const idFrac = Number(fracPartStr);

    if (!Number.isInteger(idInt) || !Number.isInteger(idFrac) || idFrac < 1) return null;
    return { t: Number(t), idInt, idFrac, value: Number(value) };
  } catch {
    return null;
  }
}


export const GraphEngine: React.FC = () => {
  const {
    configs,
    data,
    pushMany, 
    pushData,
    axis,
    display,
    numGraphs,
    bufferSize,
  } = useGraphStore();

  // Listen for global start/stop requests coming from the control bar
  useEffect(() => {
    const onStart = () => connectAll();
    const onStop  = () => disconnectAll();
    window.addEventListener("graph:start", onStart);
    window.addEventListener("graph:stop", onStop);
    return () => {
      window.removeEventListener("graph:start", onStart);
      window.removeEventListener("graph:stop", onStop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasHydrated = useGraphStore((s) => s._hasHydrated);
  if (!hasHydrated) {
    return <div className="p-4 text-sm text-muted-foreground">Loading graphs…</div>;
  }

  const { connectedDevices } = useBLEStore();
  const deviceMac = useMemo(
    () => (connectedDevices?.[0]?.mac) || "",
    [connectedDevices]
  );

  /** Unique UUIDs (order matters for idInt mapping) */
  const uniqueUUIDs = useMemo(() => {
    const s = new Set<string>();
    for (const cfg of configs) s.add(cfg.sourceUUID);
    return Array.from(s);
  }, [configs]);

  /** Map UUID -> list of configs that use it */
  const uuidToConfigs = useMemo(() => {
    const map = new Map<string, typeof configs>();
    for (const u of uniqueUUIDs) {
      map.set(u, configs.filter((c) => c.sourceUUID === u));
    }
    return map;
  }, [uniqueUUIDs, configs]);

  /** Map UUID -> its index inside uniqueUUIDs */
  // const uuidIndex = useMemo(() => {
  //   const m = new Map<string, number>();
  //   uniqueUUIDs.forEach((u, i) => m.set(u, i));
  //   return m;
  // }, [uniqueUUIDs]);

  // --- WS management ---
  const socketsRef = useRef<Record<WSKey, WebSocket>>({});
  const [isConnected, setIsConnected] = useState(false);

   // pending batches + flush timer
  type Row = { timestamp: number } & Record<string, number>;

  const pendingRef = useRef<Record<string, Row[]>>({});
  //const pendingRef = useRef<Record<string, { timestamp: number } & Record<string, number>[]> >({});
  const flushTimerRef = useRef<number | null>(null);
  const FLUSH_MS = 80; // ~12.5 fps is enough for smooth charts. Tune if you like.

  const scheduleFlush = () => {
    if (flushTimerRef.current != null) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      const batches = pendingRef.current;
      pendingRef.current = {};
      if (Object.keys(batches).length > 0) {
        // Single store update for ALL charts
        pushMany(batches);
      }
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

    for (const uuid of uniqueUUIDs) {
      const key: WSKey = `${deviceMac}|${uuid}`;
      if (created[key] && created[key].readyState === WebSocket.OPEN) continue;

      const safeMac = deviceMac.replace(/:/g, "_"); // backend expects underscores
      const url = `${WS_BASE}/ws/ble/graph/mac=${encodeURIComponent(safeMac)}/uuid=${encodeURIComponent(uuid)}`;
      console.log("Connecting to WS:", url);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log("WS open", key);
        created[key] = ws;
        socketsRef.current = { ...created };
        recomputeConnected(created);
      };

      ws.onmessage = (ev) => {
        const parsed = parseBackendFrame(ev.data);
        if (!parsed) return;
        const { t, idFrac, value } = parsed;

        const lineIndex = idFrac > 0 ? idFrac - 1 : 0;
        const cfgsForUuid = uuidToConfigs.get(uuid) ?? [];
        if (cfgsForUuid.length === 0) return;

        for (const cfg of cfgsForUuid) {
          const matches = cfg.lines.filter(
            (ln) => typeof ln.byteIndex === "number" && (ln.byteIndex as number) === lineIndex
          );
          if (matches.length === 0) continue;

          const patch: Record<string, number> = {};
          for (const ln of matches) patch[ln.label] = value;

          // ---- batched queue (typed) ----
          const row: Row = { timestamp: t, ...patch };
          const map = pendingRef.current;
          if (!map[cfg.id]) map[cfg.id] = [] as Row[];
          map[cfg.id]!.push(row);
        }

        scheduleFlush(); // debounced pushMany()
      };


      ws.onerror = () => {
        console.warn("WS error", key);
      };

      ws.onclose = () => {
        delete created[key];
        socketsRef.current = { ...created };
        recomputeConnected(created);
      };

      created[key] = ws;
    }

    socketsRef.current = created;
    recomputeConnected(created);
  };

  const disconnectAll = () => {
    console.log("Disconnecting all WebSockets");
    const cur = socketsRef.current;
    Object.values(cur).forEach((ws) => {
      try { ws.close(); } catch {}
    });
    socketsRef.current = {};
    setIsConnected(false);
    Object.values(socketsRef.current).forEach((ws) => { try { ws.close(); } catch {} });

    window.dispatchEvent(new CustomEvent("graph:state", { detail: { running: false } }));
    // Clear pending + timer
    pendingRef.current = {};
    if (flushTimerRef.current != null) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  };

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

  // --- Axis helpers ---
  const yDomain: [number | "auto", number | "auto"] = axis.fixed
    ? [axis.min, axis.max]
    : ["auto", "auto"];

  const defaultPalette = ['#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#eab308', '#06b6d4'];
  const palette: string[] =
    Array.isArray(display.palette) && display.palette.length > 0
      ? display.palette
      : defaultPalette;

  const colorFor = (i: number) => palette[i % palette.length];

  return (
    <div className="space-y-4">
      <StreamControlBar />
      {/* Connection controls */}
      {/* <div className="flex items-center justify-between rounded-md border p-3">
        <div className="text-sm">
          <div className="font-medium">
            Device MAC: <span className="text-muted-foreground">{deviceMac || "— (no device)"}</span>
          </div>
          <div className="text-muted-foreground">
            Streams: {uniqueUUIDs.length} | Buffer/graph: {bufferSize}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={isConnected ? disconnectAll : connectAll}
            disabled={!deviceMac || uniqueUUIDs.length === 0}
            variant={isConnected ? "outline" : "secondary"}
          >
            {isConnected ? "Disconnect" : "Connect"}
          </Button>
        </div>
      </div> */}

      {/* Charts */}
      <div className={gridColsClass}>
        {configs.map((cfg) => {
          const rows = data[cfg.id] ?? [];
          const seriesLabels = cfg.lines.map((l) => l.label);

          return (
            <div key={cfg.id} className="rounded-2xl border p-3 shadow-sm bg-background">
              <div className="mb-2">
                <div className="font-semibold">{cfg.title}</div>
                <div className="text-xs text-muted-foreground">UUID: {cfg.sourceUUID}</div>
              </div>

              <div style={{ height: display.height }}>
                <ResponsiveContainer width={`${display.widthPct}%`} height="100%">
                  {display.useBar ? (
                    <BarChart data={rows}>
                      {display.showGrid && <CartesianGrid strokeDasharray="3 3" />}
                      <XAxis dataKey="timestamp" tickFormatter={(v) => new Date(Number(v)).toLocaleTimeString()} />
                      <YAxis domain={yDomain} tickCount={axis.tickCount ?? 5} />
                      <Tooltip labelFormatter={(v) => new Date(Number(v)).toLocaleTimeString()} />
                      {display.showLegend && <Legend />}
                      {seriesLabels.map((lbl, i) => (
                        <Bar key={lbl} dataKey={lbl} isAnimationActive={false} fill={colorFor(i)} />
                      ))}
                    </BarChart>
                  ) : (
                    <LineChart data={rows}>
                      {display.showGrid && <CartesianGrid strokeDasharray="3 3" />}
                      <XAxis dataKey="timestamp" tickFormatter={(v) => new Date(Number(v)).toLocaleTimeString()} />
                      <YAxis domain={yDomain} tickCount={axis.tickCount ?? 5} />
                      <Tooltip labelFormatter={(v) => new Date(Number(v)).toLocaleTimeString()} />
                      {display.showLegend && <Legend />}
                      {seriesLabels.map((lbl, i) => (
                        <Line
                          key={lbl}
                          dataKey={lbl}
                          dot={false}
                          isAnimationActive={false}
                          strokeWidth={1.5}
                          connectNulls
                          type={display.smooth ? "monotone" : "linear"}
                          stroke={colorFor(i)}
                        />
                      ))}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GraphEngine;
