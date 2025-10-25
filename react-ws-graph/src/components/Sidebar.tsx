import React, { useState } from "react";
import { NavLink } from "react-router-dom";
// import { Link } from 'react-router-dom';
import { ChevronLeft} from "lucide-react";
import {FpsCounter} from "./FpsCounter";
import { useUIStore } from "../store/useUIStore"; // adjust path

// import { useFpsStore } from "@/store/useFpsStore";


export const Sidebar: React.FC = () => {
  const [expanded, setExpanded] = useState(true);
  const showFps = useUIStore((s) => s.showFps);

  const items = [
    { name: "Dashboard", icon: "🏠", path: "/dashboard" },
    { name: "Sensor Config", icon: "🔌", path: "/sensor-config" },
    { name: "Layout Config", icon: "🧱", path: "/layout-config" },
    { name: "Protocol Config", icon: "📡", path: "/protocol-config" },
    { name: "Graph Config", icon: "📊", path: "/graph-config" }, 
    { name: "General Config", icon: "⚙️", path: "/configuration" },
    { name: "Settings", icon: "🧩", path: "/settings" },
  ];

  return (
    <div className={`h-screen border-r border-border bg-background text-foreground transition-all duration-300 flex flex-col ${expanded ? "w-64" : "w-14"}`}>
      {/* Top: Title + Collapse */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        {expanded && <h1 className="text-xl font-bold">Fitness App</h1>}
        <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-lg transition-colors bg-transparent hover:bg-muted"
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
      <nav className="flex-1 px-1 py-4 space-y-1">
        {items.map(({ name, icon, path }) => (
          <NavLink
            key={name}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive ? "bg-muted text-primary font-semibold" : "hover:bg-muted"
              }`
            }
          >
            <span className="text-xl">{icon}</span>
            {expanded && <span className="truncate">{name}</span>}
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