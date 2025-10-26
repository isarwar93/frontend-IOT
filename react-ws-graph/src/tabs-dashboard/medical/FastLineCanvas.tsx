import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

type Props = {
  // External single shared time buffer (optional). If omitted and simulate=true, component will simulate data.
  times?: Float64Array;

  // External per-series value buffers (optional). If omitted and simulate=true, component will simulate data.
  valuesList?: Float32Array[]; // one Float32Array per series

  // head/len can be provided for external buffers (single head/len used for all series)
  head?: number;
  len?: number;

  numSeries?: number;        // how many waveforms to simulate / draw
  sampleInterval?: number;   // ms between samples when simulating
  cap?: number;              // buffer capacity

  // Visual config
  // If width/height are provided, they become minimum sizes; component is responsive to container otherwise.
  width?: number;
  height?: number;
  backgroundClassName?: string;
  maxPoints?: number;
  lineColors?: string[];
  graphTitle?:string;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const DEFAULT_COLORS_DARK = ["#60A5FA", "#fcf8f0ff", "#F87171", "#A78BFA", "#FBBF24", "#06B6D4"];
const DEFAULT_COLORS_LIGHT = ["#2563EB", "#292723ff", "#DC2626", "#7C3AED", "#B45309", "#0891B2"];

export default function FastLineCanvas({
  times: extTimes,
  valuesList: extValuesList,
  head: extHead,
  len: extLen,
  numSeries = 1,
  cap = 4096,
  width = 800,
  height = 300,
  backgroundClassName = "bg-neutral-900",
  maxPoints = 2000,
  lineColors:extLineColors,
  graphTitle
}: Props) {
  const { theme } = useTheme();
  const [ isDark, setIsDark ] = useState<boolean>();

  useEffect(()=>{
    if (theme === "dark") setIsDark(true);
    else setIsDark(false);
  },[theme]);

  // refs and state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // dynamic size (responsive)
  const [size, setSize] = useState<{ width: number; height: number }>(() => ({ width, height }));

  // buffer refs (internal when external not provided)
  const capRef = useRef<number>(cap);
  const timesRef = useRef<Float64Array>(extTimes ?? new Float64Array(capRef.current));
  const valuesRefList = useRef<Float32Array[]>(
    extValuesList ?? Array.from({ length: numSeries }, () => new Float32Array(capRef.current))
  );
  const headRef = useRef<number>(typeof extHead === "number" ? extHead : -1);
  const lenRef = useRef<number>(typeof extLen === "number" ? extLen : 0);
  const lineColorsRef = useRef<string[]>(extLineColors ?? []);
  // sync external props when they change
  useEffect(() => { if (extTimes) timesRef.current = extTimes; }, [extTimes]);
  useEffect(() => { if (extValuesList) valuesRefList.current = extValuesList; }, [extValuesList]);
  useEffect(() => { if (typeof extHead === "number") headRef.current = extHead; }, [extHead]);
  useEffect(() => { if (typeof extLen === "number") lenRef.current = extLen; }, [extLen]);
  useEffect(() => { if (extLineColors) extLineColors = extLineColors; }, [extLineColors]);


  // main draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const targetW = Math.max(1, size.width);
    const targetH = Math.max(1, size.height);

    // set canvas pixel size once per effect
    canvas.width = Math.floor(targetW * dpr);
    canvas.height = Math.floor(targetH * dpr);
    // canvas.style.width = `${targetW}px`;
    // canvas.style.height = `${targetH}px`;
    // reset transform to device pixels then work in CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // visual parameters
    const drawPadding = 6; // px padding from edges
    const innerW = targetW - drawPadding * 2;
    const innerH = targetH - drawPadding * 2;

  
    let colors: string[];
    // choose colors based on theme
    lineColorsRef.current=extLineColors??[];
    if (lineColorsRef.current.length>0) {
      colors = lineColorsRef.current;
    } 
    else {
     colors = isDark ? DEFAULT_COLORS_DARK : DEFAULT_COLORS_LIGHT;
    }
    
    const gridColor = isDark ? "#263238" : "#4e6696ff";
    const bgColor = isDark ? "#0b1220" : "#7186a1ff";

    let running = true;

    const drawOnce = () => {
      if (!running) return;

      const localTimes = timesRef.current;
      const localValuesList = valuesRefList.current;
      const head = headRef.current;
      const len = lenRef.current;
      const localCap = capRef.current;

      // n = how many points to draw (cap at maxPoints)
      const n = Math.min(len, maxPoints);
      if (n <= 1 || head < 0) {
        // clear to background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, targetW, targetH);
        rafRef.current = requestAnimationFrame(drawOnce);
        return;
      }

      // compute start index (oldest point)
      const start = (head - (n - 1) + localCap) % localCap;

      // autoscale across all series with a decimated scan for performance
      let min = Infinity, max = -Infinity;
      const step = Math.max(1, Math.floor(n / 1200)); // scan at most ~1200 points
      for (let i = 0, idx = start; i < n; i += step, idx = (idx + step) % localCap) {
        for (let s = 0; s < localValuesList.length; s++) {
          const v = localValuesList[s][idx];
          if (!Number.isFinite(v)) continue;
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
        // fallback range
        min = isFinite(min) ? min - 1 : -1;
        max = min + 2;
      }

      // If we have valid timestamps, compute X by time; otherwise use index spacing (stable spacing for simulated data).
      let useTime = true;
      const tStart = localTimes[start];
      const tEnd = localTimes[(start + n - 1) % localCap];
      if (!Number.isFinite(tStart) || !Number.isFinite(tEnd) || tEnd <= tStart) useTime = false;

      // Clear background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, targetW, targetH);

      // draw grid (lightweight)
      ctx.save();
      ctx.translate(drawPadding, drawPadding);
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const gxCount = 8;
      const gyCount = 4;
      for (let gx = 0; gx <= gxCount; gx++) {
        const x = (gx / gxCount) * innerW;
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, innerH);
      }
      for (let gy = 0; gy <= gyCount; gy++) {
        const y = (gy / gyCount) * innerH;
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(innerW, Math.round(y) + 0.5);
      }
      ctx.strokeStyle = gridColor;
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;

      // draw each series
      for (let s = 0; s < localValuesList.length; s++) {
        const vals = localValuesList[s];
        const color = colors[s % colors.length];
        ctx.lineWidth = 1.6 + (s === 0 ? 0.6 : 0);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = color;
        ctx.beginPath();

        // compute X step if using index-based spacing (stable) — this avoids jitter when timestamps have small jitter
        const indexSpacing = innerW / Math.max(1, n - 1);

        for (let i = 0, idx = start; i < n; i++, idx = (idx + 1) % localCap) {
          const v = vals[idx];
          const vy = (v - min) / (max - min);
          const y = drawPadding + clamp(1 - vy, 0, 1) * innerH;

          let x;
          if (useTime) {
            // time-based x (keeps true time scaling when external times are provided)
            const tx = (localTimes[idx] - tStart) / (tEnd - tStart);
            x = drawPadding + clamp(tx, 0, 1) * innerW;
          } else {
            // stable index-based spacing
            x = drawPadding + i * indexSpacing;
          }

          // snap to half pixel for crisp stable lines and to reduce trembling
          const sx = Math.round(x) + 0.5;
          const sy = Math.round(y) + 0.5;

          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      rafRef.current = requestAnimationFrame(drawOnce);
    };

    rafRef.current = requestAnimationFrame(drawOnce);

    return () => {
      running = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // NOTE: we intentionally omit references to changing refs inside deps so the same loop continues to read refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, maxPoints, isDark, backgroundClassName]);



  // render container and canvas
  return (
      <div ref={containerRef}
       className={`border-t-0 border-l-0 border relative rounded-tl`}
       style={{width:"100%", position:"relative", height: "33.3%"}}
       >

      <div className="font-mono font-semibold absolute top-0 left-0"
        style={{color: isDark ? DEFAULT_COLORS_DARK[1] : DEFAULT_COLORS_LIGHT[1]}}
        >
      {graphTitle ?? "Title"}
      </div>
      <canvas
        style={{  borderRadius: 5 ,width: "100%", height: "100%"}}
        ref ={canvasRef}
      />
      </div>
  );
}
