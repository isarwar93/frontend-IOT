// src/components/GraphEngine.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import { useGraphStore } from "@/store/useGraphStore";
import { useBLEStore } from "@/store/useBLEStore";
import { Button } from "@/components/ui/Button";

// If you also have a UI store with user-picked MAC, you can import it too:
// import { useUIStore } from "@/store/useUIStore";

type WSKey = string; // `${mac}|${uuid}`

const WS_BASE = import.meta.env.VITE_API_BASE_URL_WS ?? ""; // e.g. ws://192.168.0.32:8000

// Robust parser: supports number, {t,v}, {timestamp:..}, array, or object payloads
function parseFrame(
  raw: string,
  lines: { label: string; byteIndex: string | number }[]
): { t: number; row: Record<string, number> } | null {
  try {
    const msg = JSON.parse(raw);

    // Timestamp
    let t = Date.now();
    if (typeof msg?.t === "number") t = msg.t;
    else if (typeof msg?.t === "string") t = Date.parse(msg.t);
    else if (typeof msg?.timestamp === "number") t = msg.timestamp;
    else if (typeof msg?.timestamp === "string") t = Date.parse(msg.timestamp);

    // Value mapping
    const row: Record<string, number> = {};

    if (typeof msg === "number") {
      // Single number -> first line
      if (lines[0]) row[lines[0].label] = msg;
      return { t, row };
    }

    if (Array.isArray(msg)) {
      // Array -> numeric indices
      for (const ln of lines) {
        const idx = typeof ln.byteIndex === "string" ? parseInt(ln.byteIndex) : ln.byteIndex;
        if (Number.isFinite(idx) && typeof msg[idx as number] === "number") {
          row[ln.label] = msg[idx as number] as number;
        }
      }
      return { t, row };
    }

    if (typeof msg === "object" && msg !== null) {
      // Object -> string keys or classic {t, v}
      if (typeof (msg as any).v === "number" && lines[0]) {
        row[lines[0].label] = (msg as any).v;
        return { t, row };
      }
      for (const ln of lines) {
        if (typeof ln.byteIndex === "string") {
          const v = (msg as any)[ln.byteIndex];
          if (typeof v === "number") row[ln.label] = v;
        } else if (typeof ln.byteIndex === "number") {
          const v = (msg as any)[String(ln.byteIndex)];
          if (typeof v === "number") row[ln.label] = v;
        }
      }
      return { t, row };
    }

    return null;
  } catch {
    return null;
  }
}

export const GraphEngine: React.FC = () => {
  const {
    configs,
    data,
    pushData,
    axis,
    display,
    numGraphs,
    bufferSize,
  } = useGraphStore();

  const { connectedDevices } = useBLEStore();
  // Optional fallback from another store:
  // const uiMac = useUIStore((s) => s.mac as string | undefined);

  const deviceMac = useMemo(
    () => (connectedDevices?.[0]?.mac /* ?? uiMac */) || "",
    [connectedDevices]
  );

  // --- WS management (one per (mac, uuid) used in configs) ---
  const socketsRef = useRef<Record<WSKey, WebSocket>>({});
  const [isConnected, setIsConnected] = useState(false);

  const uniqueUUIDs = useMemo(() => {
    const s = new Set<string>();
    for (const cfg of configs) s.add(cfg.sourceUUID);
    return Array.from(s);
  }, [configs]);

  const connectAll = () => {
    if (!deviceMac) return;
    const created: Record<WSKey, WebSocket> = { ...socketsRef.current };

    for (const uuid of uniqueUUIDs) {
      const key: WSKey = `${deviceMac}|${uuid}`;
      if (created[key] && created[key].readyState === WebSocket.OPEN) continue;
      const safeMac = deviceMac.replace(/:/g, "_");
      const url = `${WS_BASE}/ws/ble/graph/mac=${encodeURIComponent(safeMac)}/uuid=${encodeURIComponent(uuid)}`;
      console.log("Connecting to WS:", url);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log("WS open", key);
      };

      ws.onmessage = (ev) => {
        console.debug("WS message", key, ev.data);
        // Fan-out the payload to all configs that use this uuid
        const relatedConfigs = configs.filter((c) => c.sourceUUID === uuid);
        for (const cfg of relatedConfigs) {
          const parsed = parseFrame(ev.data, cfg.lines);
          if (!parsed) continue;
          // Build row exactly as useGraphStore expects (timestamp auto-added by pushData)
          pushData(cfg.id, parsed.row);
        }
      };

      ws.onerror = () => {
        // console.warn("WS error", key);
      };

      ws.onclose = () => {
        // console.log("WS close", key);
        delete created[key];
        socketsRef.current = { ...created };
        // Update connection flag
        const anyOpen = Object.values(created).some((x) => x.readyState === WebSocket.OPEN);
        setIsConnected(anyOpen);
      };

      created[key] = ws;
    }

    socketsRef.current = created;
    setIsConnected(true);
  };

  const disconnectAll = () => {
    const cur = socketsRef.current;
    Object.values(cur).forEach((ws) => {
      try { ws.close(); } catch {}
    });
    socketsRef.current = {};
    setIsConnected(false);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      disconnectAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Layout helpers ---
  const gridColsClass = useMemo(() => {
    const cols = Math.max(1, Math.min(4, numGraphs || configs.length || 1));
    return `grid grid-cols-1 md:grid-cols-${cols} gap-4`;
  }, [numGraphs, configs.length]);

  // --- Axis helpers ---
  const yDomain: [number | "auto", number | "auto"] = axis.fixed
    ? [axis.min, axis.max]
    : ["auto", "auto"];

  // --- Render ---
  return (
    <div className="space-y-4">
      {/* Connection controls */}
      <div className="flex items-center justify-between rounded-md border p-3">
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
            onClick={connectAll}
            disabled={!deviceMac || uniqueUUIDs.length === 0 || isConnected}
          >
            Connect
          </Button>
          <Button variant="outline" onClick={disconnectAll} disabled={!isConnected}>
            Disconnect
          </Button>
        </div>
      </div>

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
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={(v) => new Date(Number(v)).toLocaleTimeString()}
                      />
                      <YAxis domain={yDomain} tickCount={axis.tickCount ?? 5} />
                      <Tooltip
                        labelFormatter={(v) => new Date(Number(v)).toLocaleTimeString()}
                      />
                      {display.showLegend && <Legend />}
                      {seriesLabels.map((lbl, i) => (
                        <Bar
                          key={lbl}
                          dataKey={lbl}
                          isAnimationActive={false}
                          fill={i === 0 ? display.primaryColor : undefined}
                        />
                      ))}
                    </BarChart>
                  ) : (
                    <LineChart data={rows}>
                      {display.showGrid && <CartesianGrid strokeDasharray="3 3" />}
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={(v) => new Date(Number(v)).toLocaleTimeString()}
                      />
                      <YAxis domain={yDomain} tickCount={axis.tickCount ?? 5} />
                      <Tooltip
                        labelFormatter={(v) => new Date(Number(v)).toLocaleTimeString()}
                      />
                      {display.showLegend && <Legend />}
                      {seriesLabels.map((lbl, i) => (
                        <Line
                          key={lbl}
                          dataKey={lbl}
                          dot={false}
                          isAnimationActive={false}
                          strokeWidth={2}
                          stroke={i === 0 ? display.primaryColor : undefined}
                          type={display.smooth ? "monotone" : "linear"}
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

// You can import either way:
// import GraphEngine from "@/components/GraphEngine";
// or
// import { GraphEngine } from "@/components/GraphEngine";
export default GraphEngine;
