import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

type Props = {
  // External per-series value buffers (optional). If omitted and simulate=true, component will simulate data.
  valuesList?: Float32Array[]; // one Float32Array per series

  // head/len can be provided for external buffers (single head/len used for all series)
  currentHead?: number;
  currentLen?: number;

  numSeries?: number;        // how many waveforms to simulate / draw
  sampleInterval?: number;   // ms between samples when simulating
  bufferCapacity?: number;              // buffer capacity

  // If width/height are provided, they become minimum sizes; component is responsive to container otherwise.
  width?: number;
  height?: number;
  backgroundClassName?: string;
  xAxisDataPoints?: number;
  lineColors?: string[];
  graphTitle?:string;
  
  // Min/max values from data store (prevents recalculation and trembling)
  storeMin?: number;
  storeMax?: number;
};


const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const DEFAULT_COLORS_DARK = ["#60A5FA", "#fcf8f0ff", "#F87171", "#A78BFA", "#FBBF24", "#06B6D4"];
const DEFAULT_COLORS_LIGHT = ["#2563EB", "#292723ff", "#DC2626", "#7C3AED", "#B45309", "#0891B2"];

export default function FastLineCanvas({
  valuesList: extValuesList,
  currentHead: extHead,
  numSeries = 1,
  bufferCapacity = 4096,
  width = 800,
  height = 300,
  xAxisDataPoints = 2048,
  lineColors:extLineColors,
  graphTitle,
  storeMin,
  storeMax
}: Props) {
  const { theme } = useTheme();
  const [ isDark, setIsDark ] = useState<boolean>();

  // refs and state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  
  // Smoothed min/max to prevent wobbly transitions
  const smoothMinRef = useRef<number | null>(null);
  const smoothMaxRef = useRef<number | null>(null);

  // dynamic size (responsive)
  const [size, setSize] = useState<{ width: number; height: number }>(() => ({ width, height }));
  let minValue = 0;
  let maxValue = 0;
  const [values, setValues] = useState<{ minValues: number; maxValue: number }>(() => ({ minValues: minValue, maxValue: maxValue }));
 
  let running = true;
  let grid_set = false;
  // main draw loop
  function canvasAnimate() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    if (!running) return;
    if (!extValuesList) return;// valuesRefList.current = extValuesList; 
    // if any external value undefined, skip
    for (let s = 0; s < extValuesList.length; s++) {
      if (!extValuesList[s]) return;
    }
    if (theme === "dark") setIsDark(true);
      else setIsDark(false);

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const targetW = Math.max(1, size.width);
    const targetH = Math.max(1, size.height);

    // set canvas pixel size once per effect
    canvas.width = Math.floor(targetW * dpr);
    canvas.height = Math.floor(targetH * dpr);
    // reset transform to device pixels then work in CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // visual parameters
    const drawPadding = 4; // px padding from edges
    const innerW = targetW - drawPadding * 2;
    const innerH = targetH - drawPadding * 2;

  
    let colors: string[];
    // choose colors based on theme
    const localLineColors=extLineColors??[];
    if (localLineColors.length>0) {
      colors = localLineColors;
    } 
    else {
     colors = isDark ? DEFAULT_COLORS_DARK : DEFAULT_COLORS_LIGHT;
    }
    
    const gridColor = isDark ? "#263238" : "#4e6696ff";
    const bgColor = isDark ? "#0b1220" : "#d1deeeff";
    
    const localValuesList = extValuesList ? extValuesList : [];

    const numOftotalSeries = localValuesList.length;
    const head = extHead !== undefined ? extHead : 0;
    const localCap = bufferCapacity? bufferCapacity : 2048;
    // Show fewer points to avoid leftmost mismatch at buffer boundaries
    const xAxisDataPointsToShow = Math.min(xAxisDataPoints - 10, localCap - 10, head);

    if (xAxisDataPointsToShow <= 1 || head < 0) {
      //clear to background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, targetW, targetH);
      rafRef.current = requestAnimationFrame(canvasAnimate);
      return;
    }
    
    // Calculate min/max from visible buffer data
    let min = Infinity;
    let max = -Infinity;
    const step = Math.max(1, Math.floor(xAxisDataPointsToShow / 500));
    
    for (let s = 0; s < numOftotalSeries; s++) {
      for (let i = 0; i < xAxisDataPointsToShow; i += step) {
        // Proper circular buffer index calculation
        const idx = ((head - xAxisDataPointsToShow + i) % localCap + localCap) % localCap;
        const v = localValuesList[s][idx];
        if (!Number.isFinite(v)) continue;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    
    // Use store min/max as fallback or if calculated values are invalid
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
      if (storeMin !== undefined && storeMax !== undefined && Number.isFinite(storeMin) && Number.isFinite(storeMax)) {
        min = storeMin;
        max = storeMax;
      } else {
        min = isFinite(min) ? min - 1 : -1;
        max = min + 2;
      }
    }
    
    // Apply exponential smoothing to prevent wobbly transitions (smoothing factor 0.15)
    const smoothingFactor = 0.15;
    if (smoothMinRef.current === null) {
      smoothMinRef.current = min;
      smoothMaxRef.current = max;
    } else {
      smoothMinRef.current = smoothMinRef.current * (1 - smoothingFactor) + min * smoothingFactor;
      smoothMaxRef.current = smoothMaxRef.current * (1 - smoothingFactor) + max * smoothingFactor;
    }
    
    const smoothMin = smoothMinRef.current;
    const smoothMax = smoothMaxRef.current;
    
    // Display values (actual data range)
    const displayMin = Math.round(smoothMin * 10) / 10;
    const displayMax = Math.round(smoothMax * 10) / 10;
    setValues({minValues: displayMin, maxValue: displayMax});
    
    // Add margin to top to prevent clipping
    const range = smoothMax - smoothMin;
    const topMargin = range * 0.10;
    const drawMin = smoothMin;
    const drawMax = smoothMax + topMargin;
    //--- Create Grid lines ---
    if (grid_set===false){
      grid_set=true;    
      // Clear background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, targetW, targetH);

      // draw grid (lightweight)
      ctx.save();
      ctx.translate(drawPadding, drawPadding);
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      const gxCount = 10;
      const gyCount = 2;
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
    }

    // draw each series
    for (let s = 0; s < localValuesList.length; s++) {
      const vals = localValuesList[s];
      // console.log("length of localValuesList[s]",vals.length);
      const color = colors[s % colors.length];
      ctx.lineWidth = 1.6 + (s === 0 ? 0.6 : 0);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.beginPath();
      
      let firstPoint = true;
      for (let i = 0; i < xAxisDataPointsToShow; i++) {
        // Proper circular buffer index calculation
        const idx = ((head - xAxisDataPointsToShow + i) % localCap + localCap) % localCap;
        const v = vals[idx];
        
        if (!Number.isFinite(v)) continue;
        
        const vy = (v - drawMin) / (drawMax - drawMin);
        const y = drawPadding + clamp(1 - vy, 0, 1) * innerH;
        const x = drawPadding + (i / xAxisDataPointsToShow) * innerW;
        
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    running = true;
  }

  useEffect(() => {
      rafRef.current = requestAnimationFrame(canvasAnimate);

      return () => {
        running = false;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      }
    }, [extValuesList,theme]); // Make sure the effect only when external values changes

  // render container and canvas
  return (
      <div 
       className={`border-t-0 border-l-0 border rounded-tl relative`}
       style={{width:"100%", position:"relative", height: "33.3%"}}
       >

      <div className="font-mono font-semibold absolute top-0 left-0"
        style={{color: isDark ? DEFAULT_COLORS_DARK[1] : DEFAULT_COLORS_LIGHT[1]}}
        >
       {values.maxValue}
      </div>
      <div className="rounded font-bold absolute bottom-0 right-0 sm:text md:text-xl lg:text-1xl xl:text-2xl"
        style={{
          color: isDark ? DEFAULT_COLORS_DARK[1] : DEFAULT_COLORS_LIGHT[1],
          background: isDark ? DEFAULT_COLORS_LIGHT[5] : DEFAULT_COLORS_DARK[5]
        }}
        >
        {graphTitle ?? "Title"}
      </div>
      <div className="font-mono font-semibold absolute bottom-0 left-0 ">
       {values.minValues}
      
      </div>
      <canvas
        style={{  borderRadius: 5 ,width: "100%", height: "100%"}}
        ref ={canvasRef}
      />
      </div>
  );
}