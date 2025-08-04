// src/components/GraphEngine.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { useGraphStore } from "../store/useGraphStore";

export const GraphEngine: React.FC = () => {
  const { configs, data } = useGraphStore();

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
      {configs.map((cfg) => {
        const graphData = data[cfg.id] || [];

        return (
          <div key={cfg.id} className="border p-4 rounded bg-white dark:bg-zinc-900 shadow">
            <h3 className="font-bold mb-2">{cfg.title}</h3>
            <LineChart width={400} height={250} data={graphData}>
              <XAxis dataKey="timestamp" tickFormatter={(v) => new Date(v).toLocaleTimeString()} />
              <YAxis />
              <Tooltip />
              <Legend />
              <CartesianGrid strokeDasharray="3 3" />
              {cfg.lines.map((line) => (
                <Line
                  key={line.label}
                  type="monotone"
                  dataKey={line.label}
                  stroke={line.color || "#8884d8"}
                  dot={false}
                />
              ))}
            </LineChart>
          </div>
        );
      })}
    </div>
  );
};
