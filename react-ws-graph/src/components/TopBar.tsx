// src/components/TopBar.tsx
import ThemeToggle from "./ThemeToggle";

const TopBar = () => {
  return (
    <div className="absolute top-4 right-4 z-50">
      <ThemeToggle />
    </div>
  );
};

export default TopBar;
