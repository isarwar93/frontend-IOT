// src/pages/GraphConfigPage.tsx
import { useGraphStore } from "../store/useGraphStore";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function GraphConfigPage() {
  const { configs, addConfig, removeConfig } = useGraphStore();
  const [title, setTitle] = useState("");
  const [uuid, setUuid] = useState("");
  const [lineKey, setLineKey] = useState("");
  const [lineLabel, setLineLabel] = useState("");

  const handleAdd = () => {
    if (!title || !uuid || !lineKey || !lineLabel) return;
    addConfig({
      id: `${uuid}_${Date.now()}`,
      title,
      sourceUUID: uuid,
      lines: [{ label: lineLabel, byteIndex: lineKey }],
    });
    setTitle(""); setUuid(""); setLineKey(""); setLineLabel("");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Graph Config</h1>

      <div className="space-y-2">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="BLE Characteristic UUID" value={uuid} onChange={(e) => setUuid(e.target.value)} />
        <Input placeholder="JSON Key or Index (e.g., 'hr' or 1)" value={lineKey} onChange={(e) => setLineKey(e.target.value)} />
        <Input placeholder="Line Label (e.g., 'Heart Rate')" value={lineLabel} onChange={(e) => setLineLabel(e.target.value)} />
        <Button onClick={handleAdd}>➕ Add Graph</Button>
      </div>

      <div className="pt-6">
        <h2 className="font-semibold">Configured Graphs</h2>
        <ul className="space-y-2">
          {configs.map((cfg) => (
            <li key={cfg.id} className="border p-3 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <strong>{cfg.title}</strong> <span className="text-xs text-muted">({cfg.sourceUUID})</span>
                  <div className="text-sm text-muted">
                    Lines: {cfg.lines.map((l) => l.label).join(", ")}
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={() => removeConfig(cfg.id)}>❌</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
