import React, { useEffect,useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronLeft,Home,Heart,Grid, Globe,PieChart,Settings, UserCog} from "lucide-react";
import {FpsCounter} from "./FpsCounter";
import { useUIStore } from "../store/useUIStore";
import { useTheme } from "next-themes";

const DEFAULT_COLORS_DARK = ["#60A5FA", "#fcf8f0ff", "#F87171", "#A78BFA", "#FBBF24", "#06B6D4"];
const DEFAULT_COLORS_LIGHT = ["#2563EB", "#292723ff", "#DC2626", "#7C3AED", "#B45309", "#0891B2"];

export const Sidebar: React.FC = () => {
  const [expanded, setExpanded] = useState(true);
  const showFps = useUIStore((s) => s.showFps);

  const { theme } = useTheme();
  const [ isDark, setIsDark ] = useState<boolean>();
  useEffect(()=>{
    if (theme === "dark") setIsDark(true);
    else setIsDark(false);
  },[theme]);

  const items = [
    { name: "Dashboard", icon: <Home/>, path: "/dashboard" },
    { name: "Sensor Config", icon: <Heart/>, path: "/sensor-config" },
    { name: "Layout Config", icon: <Grid/>, path: "/layout-config" },
    { name: "Protocol Config", icon: <Globe/>, path: "/protocol-config" },
    { name: "Graph Config", icon: <PieChart/>, path: "/graph-config" }, 
    { name: "Settings", icon: <Settings/>, path: "/settings" },
  ];



  return (
    <div className={`h-screen border-r border-border bg-background text-foreground transition-all duration-300 flex flex-col ${expanded ? "w-64" : "w-14"}`}>
      {/* Top: Title + Collapse */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        {expanded && <h1 className="text-xl font-bold">Fitness App</h1>}
        <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-md transition-colors bg-transparent hover:bg-muted  px-1 py-1"
        >
            <ChevronLeft
              className={`
                h-5 w-5 transition-transform
                ${expanded ? "" : "rotate-180"}
                text-black dark:text-white
              `}
            />
          </button>
      </div>
      {/* Navigation */}
      <nav className="flex-1 px-1 py-1 space-y-1">
        {items.map(({ name, icon, path }) => (
          <NavLink
            key={name}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-1 px-3 py-2 rounded-md transition-colors duration-200 ${
                isActive
                  ? isDark
                    ? "bg-blue-700 hover:bg-blue-600 font-semibold"
                    : "bg-blue-500 hover:bg-blue-400 font-semibold"
                  : isDark
                  ? "hover:bg-gray-700"
                  : "hover:bg-gray-400"
              }`
            }
          >
            <span className="text-md"
            style={{color: isDark ? DEFAULT_COLORS_DARK[1] : DEFAULT_COLORS_LIGHT[1]}}
            >{icon}</span>
            {expanded && <span 
            style={{color: isDark ? DEFAULT_COLORS_DARK[1] : DEFAULT_COLORS_LIGHT[1]}}
            className="truncate">{name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Version + FPS */}
          <div className="px-1 py-1 border-t border-border text-sm text-muted-foreground">
            {expanded ? (
              <div className="flex justify-between">
               <div>v1.0.0</div>
               {showFps && <FpsCounter />}
              </div>
            ) : (
              <div className="p-1  text-sm text-muted-foreground flex justify-between items-center">
               <div>v1.0.0</div>
               {showFps && <FpsCounter />}
              </div>
            )}
          </div>

    </div>
  );
};

export default Sidebar;