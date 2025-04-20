// src/views/HeatMapView.tsx
import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";

const generateDummyData = (rows: number, cols: number): number[][] => {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(Math.random() * 100))
  );
};

const dummyData = generateDummyData(10, 10);

// Color palettes
const palettes = {
  blue: "rgba(59, 130, 246,", // blue-500
  red: "rgba(239, 68, 68,",   // red-500
  green: "rgba(34, 197, 94,", // green-500
  purple: "rgba(168, 85, 247,", // purple-500
};

export const HeatMapView: React.FC = () => {
  const [colorBase, setColorBase] = useState(palettes.blue);
  const containerRef = useRef<HTMLDivElement>(null);

  // 🔁 Flattened for rendering
  const flatData = dummyData.flat();

  // 📁 Export CSV
  const exportCSV = () => {
    const csvRows = dummyData.map(row => row.join(","));
    const csv = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "heatmap-data.csv";
    link.click();
  };

  // 🖼️ Export Image
  const exportImage = () => {
    if (!containerRef.current) return;
    html2canvas(containerRef.current).then(canvas => {
      const link = document.createElement("a");
      link.download = "heatmap.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };

  return (
    <div className="p-4 rounded-xl bg-card shadow border border-border space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Custom Heatmap</h2>
        <span className="text-sm text-muted-foreground">
          🌡 Real-time view with export options
        </span>
      </div>

      {/* Color + Export Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {Object.entries(palettes).map(([name, base]) => (
            <button
              key={name}
              onClick={() => setColorBase(base)}
              className={`w-6 h-6 rounded-full border-2 ${
                colorBase === base ? "border-black dark:border-white" : "border-transparent"
              }`}
              style={{ backgroundColor: `${base}1)` }}
              title={name}
            />
          ))}
        </div>

        <button
          onClick={exportCSV}
          className="px-3 py-1 bg-primary text-white text-sm rounded-md"
        >
          Export CSV
        </button>
        <button
          onClick={exportImage}
          className="px-3 py-1 bg-primary text-white text-sm rounded-md"
        >
          Export Image
        </button>
      </div>

      {/* Heatmap Grid */}
      <div
        ref={containerRef}
        className="grid grid-cols-10 gap-[2px] bg-border w-fit"
      >
        {flatData.map((value, idx) => (
          <div
            key={idx}
            className="w-10 h-10 flex items-center justify-center text-xs text-white"
            style={{
              backgroundColor: `${colorBase}${value / 100})`,
            }}
          >
            {value}
          </div>
        ))}
      </div>
    </div>
  );
};
