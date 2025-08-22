// src/components/GraphEngine.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import { useGraphStore } from "@/store/useGraphStore";
import { useBLEStore } from "@/store/useBLEStore";
import { Button } from "@/components/ui/Button";

type WSKey = string; // `${mac}|${uuid}`

const WS_BASE = import.meta.env.VITE_API_BASE_URL_WS ?? "";

/**
 * Parse backend frame of shape:
 *   { time: "<ms>" | <ms>, id: "<n.m>" | <n.m number>, value: <number> }
 * Returns null if invalid.
 */
function parseBackendFrame(raw: string): {
  t: number;
  idInt: number;     // integer part before dot
  idFrac: number;    // integer fractional part after dot (1-based)
  value: number;
} | null {
  try {
    const msg = JSON.parse(raw);

    // time can be number or string; default now
    let t = Date.now();
    if (typeof msg?.time === "number") t = msg.time;
    else if (typeof msg?.time === "string") t = Number(msg.time);

    // id can be number 0.3 or string "0.3"
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

    // Split id into integer and fractional (e.g., 0.3 -> int=0, frac=3)
    // Note: we treat the fractional part as an integer index (1-based).
    const idStr = String(idNum);
    const [intPartStr, fracPartStr = "0"] = idStr.split(".");
    const idInt = Number(intPartStr);
    const idFrac = Number(fracPartStr);

    if (!Number.isInteger(idInt) || !Number.isInteger(idFrac) || idFrac < 1) {
      return null;
    }

    return { t: Number(t), idInt, idFrac, value: Number(value) };
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

  const deviceMac = useMemo(
    () => (connectedDevices?.[0]?.mac) || "",
    [connectedDevices]
  );

  /** List unique UUIDs in the order they appear across configs. */
  const uniqueUUIDs = useMemo(() => {
    const s = new Set<string>();
    for (const cfg of configs) s.add(cfg.sourceUUID);
    return Array.from(s);
  }, [configs]);

  /** Map UUID -> list of configs (graphs) that use it, in appearance order */
  const uuidToConfigs = useMemo(() => {
    const map = new Map<string, typeof configs>();
    for (const u of uniqueUUIDs) {
      map.set(u, configs.filter((c) => c.sourceUUID === u));
    }
    return map;
  }, [uniqueUUIDs, configs]);

  /** Map UUID -> its index inside uniqueUUIDs */
  const uuidIndex = useMemo(() => {
    const m = new Map<string, number>();
    uniqueUUIDs.forEach((u, i) => m.set(u, i));
    return m;
  }, [uniqueUUIDs]);

  // --- WS management (one per (mac, uuid) used in configs) ---
  const socketsRef = useRef<Record<WSKey, WebSocket>>({});
  const [isConnected, setIsConnected] = useState(false);

  const connectAll = () => {
    if (!deviceMac) return;
    const created: Record<WSKey, WebSocket> = { ...socketsRef.current };

    for (const uuid of uniqueUUIDs) {
      const key: WSKey = `${deviceMac}|${uuid}`;
      if (created[key] && created[key].readyState === WebSocket.OPEN) continue;

      // keep ':' as '_' to match your backend routing
      const safeMac = deviceMac.replace(/:/g, "_");
      const url = `${WS_BASE}/ws/ble/graph/mac=${encodeURIComponent(safeMac)}/uuid=${encodeURIComponent(uuid)}`;
      console.log("Connecting to WS:", url);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log("WS open", key);
      };

      ws.onmessage = (ev) => {
        // Example frame: { time: "1692212345678", id: "0.2", value: 12.34 }
        // console.log("WS message", key, ev.data);
        const parsed = parseBackendFrame(ev.data);
        if (!parsed) return;
        const { t, idInt, idFrac, value } = parsed;

        // 1) Make sure this frame is for this UUID stream.
        const thisUuidIdx = uuidIndex.get(uuid);
        if (thisUuidIdx === undefined || thisUuidIdx !== idInt) {
          console.warn(`WS message for UUID ${uuid} has idInt ${idInt}, expected ${thisUuidIdx}. Ignoring.`);
          return;
        }

        // 2) Find the (single) graph config for this UUID that contains *all* lines
        
        // idFrac could be 0-based (0..N-1) or 1-based (1..N)
        const cfgsForUuid = uuidToConfigs.get(uuid) ?? [];
        const tryIndices = [idFrac, idFrac - 1].filter((x) => Number.isInteger(x) && x >= 0);

        let cfg: (typeof configs)[number] | undefined;
        let lineIndex = -1;

        for (const candidate of tryIndices) {
          const found = cfgsForUuid
            .slice()
            .sort((a, b) => (b.lines?.length ?? 0) - (a.lines?.length ?? 0))
            .find((c) => Array.isArray(c.lines) && !!c.lines[candidate]);
          if (found) {
            cfg = found;
            lineIndex = candidate;
            break;
          }
        }

        if (!cfg) {
          console.warn(
            `WS ${uuid}: got idFrac=${idFrac} (raw id), but no config has line at 0- or 1-based index. ` +
            `Configs lines: [${cfgsForUuid.map(c => c.lines.length).join(", ")}]`
          );
          return;
        }


        // 3) Route the value into the *correct* line by label
        const label = cfg.lines[lineIndex]?.label ?? `value${idFrac}`;
        pushData(cfg.id, { [label]: value, timestamp: t });
};

      ws.onerror = () => {
        console.warn("WS error", key);
      };

      ws.onclose = () => {
        delete created[key];
        socketsRef.current = { ...created };
        const anyOpen = Object.values(created).some((x) => x.readyState === WebSocket.OPEN);
        setIsConnected(anyOpen);
      };

      created[key] = ws;
    }

    socketsRef.current = created;
    setIsConnected(true);
  };

  const disconnectAll = () => {
    console.log("Disconnecting all WebSockets");
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

const defaultPalette = ['#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#eab308', '#06b6d4']; // blue, green, red, violet, yellow, cyan

  const palette: string[] =
    Array.isArray(display.palette) && display.palette.length > 0
      ? display.palette
      : defaultPalette;

  const colorFor = (i: number) => palette[i % palette.length]; // always string

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
                      <XAxis dataKey="timestamp" tickFormatter={(v) => new Date(Number(v)).toLocaleTimeString()} />
                      <YAxis domain={yDomain} tickCount={axis.tickCount ?? 5} />
                      <Tooltip labelFormatter={(v) => new Date(Number(v)).toLocaleTimeString()} />
                      {display.showLegend && <Legend />}
                      {seriesLabels.map((lbl, i) => (
                        <Bar
                          key={lbl}
                          dataKey={lbl}
                          isAnimationActive={false}
                          fill={colorFor(i)}
                        />
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
                          //stroke={palette[i+3 % palette.length]} // <-- color every series
                          stroke={colorFor(i)} // <-- alternative using colorFor
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