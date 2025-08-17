// src/pages/GraphConfig.tsx
import { useMemo, useState } from "react";
import { useGraphStore } from "@/store/useGraphStore";
import { useBLEStore } from "@/store/useBLEStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type CharMeta = { id: string; name?: string; uuid: string; numberOfValues: number };

export default function GraphConfig() {
  const { configs, addConfig, removeConfig, numGraphs, setNumGraphs, axis, setAxis, display, setDisplay } =
    useGraphStore();
  const { charValues } = useBLEStore();

  // Flatten BLE charValues -> list for UI
  const chars: CharMeta[] = useMemo(() => {
    const list: CharMeta[] = [];
    for (const [id, meta] of Object.entries(charValues || {})) {
      const parts = id.split("-");
      const uuid = parts[parts.length - 1] || id;
      list.push({
        id,
        uuid,
        name: meta?.name,
        numberOfValues: Number(meta?.numberOfValues ?? 0),
      });
    }
    return list.sort((a, b) => (a.name || a.uuid).localeCompare(b.name || b.uuid));
  }, [charValues]);

  // ------- Global settings quick edits -------
  const [minY, setMinY] = useState(axis.min);
  const [maxY, setMaxY] = useState(axis.max);

  const applyAxis = () => setAxis({ ...axis, min: minY, max: maxY });
  const toggleUseBar = () => setDisplay({ ...display, useBar: !display.useBar });

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">📊 Graph Configuration</h1>

      {/* Global Settings */}
      <div className="border rounded p-4 space-y-4">
        <h2 className="text-lg font-semibold">Global Settings</h2>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Number of Columns:</label>
            <Input
              type="number"
              value={numGraphs}
              onChange={(e) => setNumGraphs(Number(e.target.value))}
              className="w-24"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Y-Axis Fixed:</label>
            <input
              type="checkbox"
              checked={axis.fixed}
              onChange={(e) => setAxis({ ...axis, fixed: e.target.checked })}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Use Bar Chart:</label>
            <input type="checkbox" checked={display.useBar} onChange={toggleUseBar} />
          </div>
        </div>

        {axis.fixed && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm">Min Y:</label>
              <Input
                className="w-24"
                type="number"
                value={minY}
                onChange={(e) => setMinY(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Max Y:</label>
              <Input
                className="w-24"
                type="number"
                value={maxY}
                onChange={(e) => setMaxY(Number(e.target.value))}
              />
            </div>
            <Button size="sm" onClick={applyAxis}>
              Apply Axis
            </Button>
          </div>
        )}
      </div>

      {/* Available Characteristics with Exclusive Assignment Configurator */}
      <div className="border rounded p-4 space-y-3">
        <h2 className="text-lg font-semibold">Available Characteristics</h2>

        {chars.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No characteristics found. Enable notifications in BLE tab to populate <code>charValues</code>.
          </p>
        ) : (
          <div className="space-y-4">
            {chars.map((c) => (
              <CharConfigurator key={c.id} charMeta={c} onCreate={(cfgs) => cfgs.forEach(addConfig)} />
            ))}
          </div>
        )}
      </div>

      {/* Current Configured Graphs */}
      <div className="border rounded p-4 space-y-3">
        <h2 className="text-lg font-semibold">Configured Graphs</h2>
        {configs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No graphs configured yet.</p>
        ) : (
          <ul className="space-y-2">
            {configs.map((cfg) => (
              <li key={cfg.id} className="border p-3 rounded flex justify-between items-start">
                <div>
                  <p className="font-medium">{cfg.title}</p>
                  <p className="text-xs text-muted-foreground">UUID: {cfg.sourceUUID}</p>
                  <p className="text-xs">
                    Lines: <span className="font-mono">{cfg.lines.length}</span>{" "}
                    {cfg.lines.length > 0 && (
                      <span className="text-muted-foreground">
                        ({cfg.lines.map((l) => l.label).join(", ")})
                      </span>
                    )}
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={() => removeConfig(cfg.id)}>
                  ❌ Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Per-characteristic exclusive assignment UI */
function CharConfigurator({
  charMeta,
  onCreate,
}: {
  charMeta: { id: string; name?: string; uuid: string; numberOfValues: number };
  onCreate: (cfgs: {
    id: string;
    title: string;
    sourceUUID: string;
    lines: { label: string; byteIndex: string | number }[];
  }[]) => void;
}) {
  const { name, uuid, numberOfValues } = charMeta;

  // How many graphs to open for assignment (up to numberOfValues; you said "up to 5" — we cap by both)
  const [graphsCount, setGraphsCount] = useState(
    Math.min(5, Math.max(0, numberOfValues))
  );

  // assignments[graphIndex] = array of selected waveform indices (1..numberOfValues)
  const [assignments, setAssignments] = useState<Record<number, number[]>>({});

  // exclusivity toggle
  const toggle = (g: number, w: number) => {
    setAssignments((prev) => {
      // remove w from *all* graphs first (exclusivity)
      const cleaned: Record<number, number[]> = {};
      const keys = new Set<number>([
        ...Object.keys(prev).map(Number),
        ...Array.from({ length: graphsCount }, (_, i) => i + 1),
      ]);
      for (const k of keys) {
        const arr = prev[k] ?? [];
        cleaned[k] = arr.filter((x) => x !== w);
      }
      // then toggle on this graph
      const has = (cleaned[g] ?? []).includes(w);
      cleaned[g] = has
        ? cleaned[g].filter((x) => x !== w)
        : [...(cleaned[g] ?? []), w].sort((a, b) => a - b);
      return cleaned;
    });
  };

  // is waveform w selected in any graph other than g?
  const usedElsewhere = (g: number, w: number) => {
    for (let i = 1; i <= graphsCount; i++) {
      if (i === g) continue;
      if ((assignments[i] ?? []).includes(w)) return true;
    }
    return false;
  };

  const clear = () => setAssignments({});

  const buildAndCreate = () => {
    const cfgs: {
      id: string;
      title: string;
      sourceUUID: string;
      lines: { label: string; byteIndex: string | number }[];
    }[] = [];

    for (let g = 1; g <= graphsCount; g++) {
      const selected = assignments[g] ?? [];
      if (selected.length === 0) continue;

      // convert waveform indices (1..N) to 0-based array indices
      const lines = selected.map((w) => ({
        label: `${name || uuid} [${w - 1}]`,
        byteIndex: w - 1,
      }));

      cfgs.push({
        id: `${uuid}_${Date.now()}_G${g}`,
        title: `${name || uuid} — Graph ${g}`,
        sourceUUID: uuid,
        lines,
      });
    }

    if (cfgs.length > 0) onCreate(cfgs);
  };

  if (numberOfValues <= 0) {
    return (
      <div className="border rounded p-3">
        <div className="font-medium">{name?.trim() ? name : uuid}</div>
        <div className="text-xs text-muted-foreground">
          UUID: {uuid} • Waveforms available: 0
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          No waveforms reported for this characteristic.
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{name?.trim() ? name : uuid}</div>
          <div className="text-xs text-muted-foreground">
            UUID: {uuid} • Waveforms available: <span className="font-mono">{numberOfValues}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Graphs to open:</label>
          <Input
            className="w-20"
            type="number"
            min={0}
            max={Math.min(5, numberOfValues)}
            value={graphsCount}
            onChange={(e) =>
              setGraphsCount(
                Math.max(0, Math.min(Math.min(5, numberOfValues), Number(e.target.value) || 0))
              )
            }
          />
        </div>
      </div>

      {/* Graph cards with exclusive checkboxes */}
      {graphsCount > 0 && (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {Array.from({ length: graphsCount }, (_, i) => i + 1).map((g) => (
            <div key={g} className="border rounded p-3 bg-background">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Graph {g}</h4>
                <span className="text-xs text-muted-foreground">
                  Selected: {(assignments[g] ?? []).length}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-5 gap-2">
                {Array.from({ length: numberOfValues }, (_, i) => i + 1).map((w) => {
                  const checked = (assignments[g] ?? []).includes(w);
                  const lock = usedElsewhere(g, w); // lock elsewhere
                  return (
                    <label
                      key={w}
                      className={`flex items-center gap-2 border rounded px-2 py-1 text-sm ${
                        lock && !checked ? "opacity-50" : ""
                      }`}
                      title={
                        lock && !checked
                          ? `Waveform ${w} is already assigned to another graph`
                          : `Waveform ${w}`
                      }
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(g, w)}
                        disabled={lock && !checked}
                      />
                      {w}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={buildAndCreate} disabled={graphsCount === 0}>
          ➕ Create Graphs from Selection
        </Button>
        <Button size="sm" variant="outline" onClick={clear} disabled={graphsCount === 0}>
          Clear Selection
        </Button>
      </div>
    </div>
  );
}
