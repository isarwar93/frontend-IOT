import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import { GraphData } from "../../types";
import { useWebSockets } from "../websocket/graphWebSocket";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import {
  ChevronDown, ChevronUp, Settings, SlidersHorizontal,
  RefreshCcw, Pause, Play, Download, Palette, Plug, PlugZap
} from "lucide-react";
import { useTheme } from "next-themes";
import { useUIStore } from "@/store/useUIStore";
import { useBLEStore } from "@/store/useBLEStore"; // <-- make sure this path matches your project

// Small helper component: subscribes a single (mac, uuid) stream and forwards points up.
function StreamSubscriber({
  mac,
  uuid,
  paused,
  onPoint,
}: {
  mac: string;
  uuid: string;
  paused: boolean;
  onPoint: (uuid: string, d: GraphData) => void;
}) {
  const ws = useWebSockets({
    mac,
    uuid,
    paused,
    onGraphData: (d) => onPoint(uuid, d),
    onConnect: () => console.log("Graph connected", uuid),
    onDisconnect: () => console.log("Graph disconnected", uuid),
  });

  useEffect(() => () => ws.disconnect?.(), [uuid, mac]);

  return null; // purely side-effect
}

// Recharts point where each key after "timestamp" is a uuid
type MultiSeriesPoint = { timestamp: number } & Record<string, number>;

export const GraphEngine = () => {
  // ---------- Global UI store ----------
  const macGlobal = useUIStore((s) => s.mac);
  const bufferSize = useUIStore((s) => s.bufferSize);
  const setBufferSize = useUIStore((s) => s.setBufferSize);
  const useBar = useUIStore((s) => s.useBar);
  const toggleUseBar = useUIStore((s) => s.toggleUseBar);
  const fixedYAxis = useUIStore((s) => s.fixedYAxis);
  const toggleFixedYAxis = useUIStore((s) => s.toggleFixedYAxis);
  const minY = useUIStore((s) => s.minY);
  const setMinY = useUIStore((s) => s.setMinY);
  const maxY = useUIStore((s) => s.maxY);
  const setMaxY = useUIStore((s) => s.setMaxY);
  const graphWidth = useUIStore((s) => s.graphWidth);
  const graphHeight = useUIStore((s) => s.graphHeight);
  const color = useUIStore((s) => s.color);
  const setColor = useUIStore((s) => s.setColor);
  const showMin = useUIStore((s) => s.showMin);
  const showMax = useUIStore((s) => s.showMax);
  const showAvg = useUIStore((s) => s.showAvg);
  const showPoints = useUIStore((s) => s.showPoints);
  const showGrid = useUIStore((s) => s.showGrid);


  // ---------- BLE store (drives what we can connect to) ----------
  const bleMac = useBLEStore((s) => s.connectedDevices); // prefer BLE store; fallback to UI store
  //   const selectedChars = useBLEStore((s) => s.selectedChars); // [{uuid, name?}, ...]
  const mac = bleMac || macGlobal || ""; // final mac we’ll use

  //  const bleMac = useBLEStore((s) => s.connectedDevices as string | undefined);
  const uiMac  = useUIStore((s) => s.mac as string | undefined);
  // const deviceMac = bleMac || uiMac || "";  // final string for display
  const deviceMac = bleMac.length > 0 ? bleMac[0].mac : uiMac || "";

  // ---------- Local UI toggles ----------
  const [showAxes, setShowAxes] = useState(false);
  const [showDisplay, setShowDisplay] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [paused, setPaused] = useState(false);


// Get it from the BLE store
const bleSelectedChars = useBLEStore((s) => s.selectedChars); // string[]

const initialChecked = useMemo(() => {
  const map: Record<string, boolean> = {};
  (bleSelectedChars || []).forEach((c) => {
    console.log("Graph engine: bleSelectedChars", c);
    const parts = c.split("-");
    const uuid = parts[parts.length - 1];
    map[uuid] = true;
  });
  return map;
}, [bleSelectedChars]);

const [checked, setChecked] = useState<Record<string, boolean>>(initialChecked);

  // Which streams are actively connected
  const [connectedUUIDs, setConnectedUUIDs] = useState<string[]>([]);

  // Data buffer: merged multi-series points keyed by timestamp
  const [data, setData] = useState<MultiSeriesPoint[]>([]);
  const bufferSizeRef = useRef(bufferSize);
  useEffect(() => { bufferSizeRef.current = bufferSize; }, [bufferSize]);

  // Stats (across all visible series)
  const stats = useRef({ min: Infinity, max: -Infinity, sum: 0, count: 0 });
  const [average, setAverage] = useState(0);

  const { theme } = useTheme();

  // Handle incoming point for a specific uuid; merge into multi-series dataset
  const onPoint = (uuid: string, point: GraphData) => {
    if (paused) return;

    setData((prev) => {
      // Try to merge this point by timestamp
      let merged = [...prev];
      const last = merged[merged.length - 1];

      const ts =
    typeof point.timestamp === "number"
      ? point.timestamp
      : (Date.parse(point.timestamp as string) || Number(point.timestamp) || 0);

    if (last && last.timestamp === ts) {
    last[uuid] = point.value;
  } else {
    merged.push({ timestamp: ts, [uuid]: point.value });
  }

      // Trim by buffer
      const trimmed = merged.slice(-bufferSizeRef.current);

      // Recompute stats across all present values
      let min = Infinity, max = -Infinity, sum = 0, count = 0;
      for (const row of trimmed) {
        for (const key of connectedUUIDs) {
          const v = row[key];
          if (typeof v === "number" && !Number.isNaN(v)) {
            if (v < min) min = v;
            if (v > max) max = v;
            sum += v;
            count++;
          }
        }
      }
      stats.current = { min, max, sum, count };
      setAverage(count ? sum / count : 0);

      return trimmed;
    });
  };

  // UI handlers
  const handleTick = (uuid: string) =>
    setChecked((m) => ({ ...m, [uuid]: !m[uuid] }));

  const handleConnect = () => {
    const uuids = (bleSelectedChars || [])
      .map((c) => {
        const parts = c.split("-");
        return parts[parts.length - 1]; // last part is uuid
      })
      .filter((u) => checked[u]);

    setConnectedUUIDs(uuids);
  };

  const handleDisconnectAll = () => {
    setConnectedUUIDs([]);
  };

  const exportCSV = () => {
    // Flatten: one column per connected uuid
    const headers = ["timestamp", ...connectedUUIDs];
    const rows = data.map((row) =>
      [row.timestamp, ...connectedUUIDs.map((u) => (row[u] ?? ""))].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `graph-${mac || "no-mac"}.csv`;
    link.click();
  };

  const handleBufferSizeChange = (val: number) => {
    const clamped = Math.max(10, Math.min(500, val));
    setBufferSize(clamped);
  };

  // Colors per series (fallback palette if user only has a single color in store)
  const palette = useMemo(
    () => [
      color,
      "#22c55e",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#06b6d4",
      "#e11d48",
      "#10b981",
    ],
    [color]
  );

  // Derived – are we connected?
  const isConnected = connectedUUIDs.length > 0 && !!mac;

  const dropdownBox = "relative";

  return (
    <div className="space-y-4">
      {/* Connection gate */}
      <div className="rounded-md border p-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">
            Device MAC:&nbsp;
           <span className="text-muted-foreground">
            {Array.isArray(mac)
                ? mac.map(d => d.name || d.mac).join(", ")
                : mac || "— (no MAC in store)"}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleConnect}
              disabled={!mac || (bleSelectedChars?.length ?? 0) === 0}
              className="flex items-center gap-2"
            >
              <PlugZap size={16} />
              Connect
            </Button>
            <Button
              onClick={handleDisconnectAll}
              variant="outline"
              disabled={!isConnected}
              className="flex items-center gap-2"
            >
              <Plug size={16} />
              Disconnect
            </Button>
          </div>
        </div>

        {/* Checklist of selected characteristics from store */}
        <div className="mt-3">
          {(bleSelectedChars?.length ?? 0) > 0 ? (
            <ul className="space-y-2">
              {bleSelectedChars!.map((c, idx) => {
                const parts = c.split("-");
                const uuid = parts[parts.length - 1];
                return (
                    <li key={uuid} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-3">
                        <input
                        type="checkbox"
                        checked={!!checked[uuid]}
                        onChange={() => handleTick(uuid)}
                        className="h-4 w-4"
                        />
                        <div className="flex flex-col">
                        <span className="font-medium">
                            Characteristic — <span className="text-muted-foreground">{uuid}</span>
                        </span>
                        </div>
                    </div>
                    </li>
                );
                })}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">
              No selected characteristics found in <code>useBLEStore</code>.
              Choose characteristics first in your BLE tab.
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-start">
        {/* Axis Settings */}
        <div className={dropdownBox}>
          <button
            onClick={() => setShowAxes(!showAxes)}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-muted hover:bg-accent font-medium w-64 justify-between text-foreground"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal size={16} /> Axis Settings
            </span>
            {showAxes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showAxes && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between border rounded-md px-3 py-2 hover:bg-accent">
                <label className="text-sm">Fixed Y-Axis</label>
                <Switch checked={fixedYAxis} onCheckedChange={toggleFixedYAxis} />
              </div>
              <div className="flex flex-col gap-1 border rounded-md px-3 py-2 hover:bg-accent">
                <label className="text-sm text-muted-foreground">Min Y: {minY}</label>
                <Slider
                  value={minY}
                  onValueChange={(val) => {
                    setMinY(val);
                    if (val >= maxY) setMaxY(val + 1);
                  }}
                  min={-500}
                  max={500}
                  step={1}
                  disabled={!fixedYAxis}
                />
              </div>
              <div className="flex flex-col gap-1 border rounded-md px-3 py-2 hover:bg-accent">
                <label className="text-sm text-muted-foreground">Max Y: {maxY}</label>
                <Slider
                  value={maxY}
                  onValueChange={(val) => {
                    setMaxY(val);
                    if (val <= minY) setMinY(val - 1);
                  }}
                  min={-500}
                  max={500}
                  step={1}
                  disabled={!fixedYAxis}
                />
              </div>
              <div className="flex flex-col gap-1 border rounded-md px-3 py-2 hover:bg-accent">
                <label className="text-sm text-muted-foreground">Buffer Size: {bufferSize}</label>
                <Slider
                  value={bufferSize}
                  onValueChange={handleBufferSizeChange}
                  min={10}
                  max={500}
                  step={1}
                />
              </div>
            </div>
          )}
        </div>

        {/* Display Options */}
        <div className={dropdownBox}>
          <button
            onClick={() => setShowDisplay(!showDisplay)}
            className="flex items-center px-4 py-2 rounded-md border-border bg-muted hover:bg-accent font-medium w-64 justify-between text-foreground"
          >
            <span className="flex items-center gap-2">
              <Palette size={16} /> Display Options
            </span>
            {showDisplay ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showDisplay && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between border rounded-md px-3 py-2 hover:bg-accent">
                <label className="text-sm">Bar Chart</label>
                <Switch checked={useBar} onCheckedChange={toggleUseBar} />
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2 hover:bg-accent">
                <div className="flex items-center gap-2">
                  <Palette size={16} />
                  <label className="text-sm">Primary Color (first series)</label>
                </div>
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-8 p-0 border-none rounded-full cursor-pointer"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Graph Controls */}
        <div className={dropdownBox}>
          <button
            onClick={() => setShowControls(!showControls)}
            className="flex items-center px-4 py-2 rounded-md border-border bg-muted hover:bg-accent font-medium w-64 justify-between"
          >
            <span className="flex items-center gap-2">
              <Settings size={16} /> Graph Controls
            </span>
            {showControls ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showControls && (
            <div className="mt-2 space-y-2">
              <Button onClick={() => setPaused((prev) => !prev)} variant="outline" className="w-full flex justify-center gap-2" disabled={!isConnected}>
                {paused ? <Play size={16} /> : <Pause size={16} />}
                {paused ? "Resume" : "Pause"}
              </Button>
              <Button onClick={exportCSV} variant="outline" className="w-full flex justify-center gap-2" disabled={data.length === 0}>
                <Download size={16} /> Export CSV
              </Button>
              <Button onClick={() => setBufferSize(100)} variant="outline" size="sm" className="w-full flex justify-center gap-2">
                <RefreshCcw size={16} /> Reset Buffer
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Small stats row */}
      <div className="text-muted-foreground text-sm">
        {showMin && Number.isFinite(stats.current.min) && <>Min: {stats.current.min.toFixed(2)} | </>}
        {showMax && Number.isFinite(stats.current.max) && <>Max: {stats.current.max.toFixed(2)} | </>}
        {showAvg && Number.isFinite(average) && <>Avg: {average.toFixed(2)} | </>}
        {showPoints && <>Points: {data.length}</>}
      </div>

      {/* The chart */}
      <ResponsiveContainer width={`${graphWidth}%`} height={graphHeight}>
        {useBar ? (
          <BarChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#444" : "#ccc"} />}
            <XAxis dataKey="timestamp" interval={Math.floor(bufferSize / 10)} />
            <YAxis domain={fixedYAxis ? [minY, maxY] : ["auto", "auto"]} />
            <Tooltip />
            <Legend />
            {connectedUUIDs.map((u, i) => (
              <Bar key={u} dataKey={u} fill={palette[i % palette.length]} />
            ))}
          </BarChart>
        ) : (
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#444" : "#ccc"} />}
            <XAxis dataKey="timestamp" interval={Math.floor(bufferSize / 10)} />
            <YAxis domain={fixedYAxis ? [minY, maxY] : ["auto", "auto"]} />
            <Tooltip />
            <Legend />
            {connectedUUIDs.map((u, i) => (
              <Line
                key={u}
                dataKey={u}
                stroke={palette[i % palette.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>

      {/* Mount subscribers only when connected */}
      {isConnected &&
        connectedUUIDs.map((u) => (
          <StreamSubscriber key={u} mac={deviceMac} uuid={u} paused={paused} onPoint={onPoint} />
        ))}
    </div>
  );
};
