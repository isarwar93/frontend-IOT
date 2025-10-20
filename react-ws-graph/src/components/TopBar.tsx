// src/components/TopBar.tsx
import ThemeToggle from "./ThemeToggle";
// import React, { useState } from "react";
import { useUIStore } from "../store/useUIStore";
import { ChevronUp } from "lucide-react";


const TopBarToggle = () => {
  const expanded = useUIStore((s) => s.topBarExpanded);
  if (!useUIStore((s) => s.isLoggedIn)) {
      return null;
  }
  return (
    <button
      onClick={() => 
        {
          const expanded = useUIStore.getState().topBarExpanded;
          useUIStore.getState().setTopBarExpanded(!expanded);
        }
      }
      className="p-2 rounded-lg transition-colors bg-transparent hover:bg-muted"
    >
      <ChevronUp
        className={`
          h-4 w-4 transition-transform
          ${expanded ? "" : "rotate-180"}
          text-black dark:text-white
        `}
      />
    </button>
  );
};
const TopBar = () => {
  // const [isLoggedIn, setIsLoggedIn] = useState(false);
  return (
    // top bar toggle on top right
    <div className="absolute">
      <div className="fixed top-1 right-1 z-10">
        <TopBarToggle />
      </div>
      <div className="fixed right-1 bottom-1 z-10">
        <ThemeToggle />
      </div>
    </div>
  );
};

export default TopBar;