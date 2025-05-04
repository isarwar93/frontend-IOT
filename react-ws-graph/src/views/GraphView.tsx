import { useEffect, useRef, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import { GraphData } from "../../types";
import { useWebSockets } from "../../hooks/useWebSockets";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import {
  ChevronDown, ChevronUp, Settings, SlidersHorizontal,
  RefreshCcw, Pause, Play, Download, Palette,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useUIStore } from "@/store/useUIStore";

export const GraphView = ({ nickname, user }: { nickname: string; user: string }) => {
  const [data, setData] = useState<GraphData[]>([]);
  const [paused, setPaused] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [showDisplay, setShowDisplay] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const stats = useRef({ min: Infinity, max: -Infinity, sum: 0 });
  const [average, setAverage] = useState(0);

  const username = useUIStore((s) => s.username);
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

  const { theme } = useTheme();
  const bufferSizeRef = useRef(bufferSize);

  useEffect(() => {
    bufferSizeRef.current = bufferSize;
  }, [bufferSize]);

  const onGraphData = (newData: GraphData) => {
    if (paused) return;
    setData((prev) => {
      const newDataArray = [...prev, newData];
      const trimmed = newDataArray.slice(-bufferSizeRef.current);
      const values = trimmed.map((d) => d.value);
      const sum = values.reduce((acc, v) => acc + v, 0);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = sum / values.length;

      stats.current = { sum, min, max };
      setAverage(avg);

      return trimmed;
    });
  };

  const ws = username
    ? useWebSockets({
        nickname,
        paused,
        onChatMessage: () => {},
        onGraphData,
        onConnect: () => console.log("Graph connected"),
        onDisconnect: () => console.log("Graph disconnected"),
      })
    : { sendMessage: () => {}, disconnect: () => {} };

  useEffect(() => {
    return () => {
      ws.disconnect?.();
    };
  }, [user, nickname]);

  const exportCSV = () => {
    const csv = ["timestamp,value", ...data.map((d) => `${d.timestamp},${d.value}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `graph-${user}.csv`;
    link.click();
  };

  const handleBufferSizeChange = (val: number) => {
    const clamped = Math.max(10, Math.min(500, val));
    setBufferSize(clamped);
  };

  const dropdownBox = "relative";

  return (
    <div className="space-y-4">
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
                  <label className="text-sm">Line/Bar Color</label>
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
              <Button onClick={() => setPaused((prev) => !prev)} variant="outline" className="w-full flex justify-center gap-2">
                {paused ? <Play size={16} /> : <Pause size={16} />}
                {paused ? "Resume" : "Pause"}
              </Button>
              <Button onClick={exportCSV} variant="outline" className="w-full flex justify-center gap-2">
                <Download size={16} /> Export CSV
              </Button>
              <Button onClick={() => setBufferSize(100)} variant="outline" size="sm" className="w-full flex justify-center gap-2">
                <RefreshCcw size={16} /> Reset Buffer
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="text-muted-foreground text-sm">
        {showMin && <>Min: {stats.current.min.toFixed(2)} | </>}
        {showMax && <>Max: {stats.current.max.toFixed(2)} | </>}
        {showAvg && <>Avg: {average.toFixed(2)} | </>}
        {showPoints && <>Points: {data.length}</>}
      </div>

      <ResponsiveContainer width={`${graphWidth}%`} height={graphHeight}>
        {useBar ? (
          <BarChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#444" : "#ccc"} />}
            <XAxis dataKey="timestamp" interval={Math.floor(bufferSize / 10)} />
            <YAxis domain={fixedYAxis ? [minY, maxY] : ["auto", "auto"]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill={color} />
          </BarChart>
        ) : (
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#444" : "#ccc"} />}
            <XAxis dataKey="timestamp" interval={Math.floor(bufferSize / 10)} />
            <YAxis domain={fixedYAxis ? [minY, maxY] : ["auto", "auto"]} />
            <Tooltip />
            <Legend />
            <Line
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
