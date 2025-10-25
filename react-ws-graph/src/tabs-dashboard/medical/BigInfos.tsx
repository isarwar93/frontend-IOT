import { useRef, useState} from "react";
import { useTheme } from "next-themes";
type Props = {
  // External single shared time buffer (optional). If omitted and simulate=true, component will simulate data.
  times?: Float64Array;

  // External per-series value buffers (optional). If omitted and simulate=true, component will simulate data.
  valuesList?: Float32Array[]; // one Float32Array per series

  // head/len can be provided for external buffers (single head/len used for all series)
  head?: number;
  len?: number;

  // Simulation mode / control
  simulate?: boolean;
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
  graphUnit?:string;
  graphValue?:string;
};

const DEFAULT_COLORS_DARK = ["#60A5FA", "#34D399", "#F87171", "#A78BFA", "#FBBF24", "#06B6D4"];
const DEFAULT_COLORS_LIGHT = ["#2563EB", "#059669", "#DC2626", "#7C3AED", "#B45309", "#0891B2"];

export default function BigInfos({
  lineColors:extLineColors,
  graphTitle,
  graphUnit,
  graphValue
}: Props) {
  const { theme } = useTheme();
  // refs and state
  const containerRef = useRef<HTMLDivElement | null>(null);


  // theme detection (prefers-color-scheme) if not overridden by prop
  const [isDark] = useState<boolean>(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return typeof window !== "undefined" ? window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches : true;
  });

  // render container
  return (
    <div 
      // ref={containerRef}
      className={`border-t-0 border-l-0 border flex relative flex-row justify-start`}
      style={{width:"100%",  height: "33.3%"}}
    >
            
      <OneInfoBox
        title="AVG"
        value= {graphValue ?? "0"}
        unit="rpm"
        color={extLineColors && extLineColors.length>0 ? extLineColors[0] : isDark ? DEFAULT_COLORS_DARK[0] : DEFAULT_COLORS_LIGHT[0]}
      />

       <OneInfoBox
        title="MAX"
        value= {graphValue ?? "0"}
        unit="rpm"
        color={extLineColors && extLineColors.length>0 ? extLineColors[0] : isDark ? DEFAULT_COLORS_DARK[0] : DEFAULT_COLORS_LIGHT[0]}
      />

       <OneInfoBox
        title="MIN"
        value= {graphValue ?? "0"}
        unit="rpm"
        color={extLineColors && extLineColors.length>0 ? extLineColors[0] : isDark ? DEFAULT_COLORS_DARK[0] : DEFAULT_COLORS_LIGHT[0]}
      />
    </div>
      
  );
}

const OneInfoBox = ({
  title,
  value,
  unit,
  color
}: {
  title: string;
  value: string;
  unit: string;
  color?: string;
}) => {
  return (
    <div 
      className="flex-col w-1/3 border borer-r-0 border-b-0 border-l-1 border-t-0 border-gray-550"
    >
      <div className="font-mono font-semibold"
        style={{color: color ?? "#2563EB"}}
      >
      {title}
      </div>
      <div 
        className="font-mono font-semibold text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl absolute top-1/2 transform -translate-y-1/2"
        style={{
              color: color ?? "#2563EB"
            }}
        >
      {value}
      </div>

      <div className="font-semibold absolute bottom-0"
        style={
          {
            color: color ?? "#2563EB"}}
        >
        {unit ?? "Unit"}
      </div>
    </div>
      
  );
} 