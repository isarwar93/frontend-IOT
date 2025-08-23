// src/pages/GraphConfig.tsx
import { useMemo, useState, useRef } from "react";
import { useGraphStore } from "@/store/useGraphStore";
import { useBLEStore } from "@/store/useBLEStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useEffect } from "react"; 
import SoftNumberInput from "@/components/SoftNumInput";

import React from "react";

type CharMeta = { id: string; name?: string; uuid: string; numberOfValues: number };

export default function GraphConfig() {
  const { configs, addConfig, removeConfig, numGraphs, setNumGraphs, axis, setAxis, display, setDisplay , bufferSize, setBufferSize } =
    useGraphStore();
  const { charValues } = useBLEStore();

  // inside GraphConfig()
  const hasHydrated = useGraphStore((s) => s._hasHydrated);
  if (!hasHydrated) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading saved graph settings…
      </div>
    );
  }


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

 
  useEffect(() => {
    setMinY(axis.min);
    setMaxY(axis.max);
  }, [hasHydrated, axis.min, axis.max]);

  const applyAxis = () => setAxis({ ...axis, min: minY, max: maxY });
  const toggleUseBar = () => setDisplay({ ...display, useBar: !display.useBar });
  const globalDefault = useGraphStore((s) => s.graphUi.defaultGraphsPerChar);
  const setGraphUi   = useGraphStore((s) => s.setGraphUi);

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">📊 Graph Configuration</h1>

      {/* Global Settings */}
      <div className="border rounded p-4 space-y-4">
        <h2 className="text-lg font-semibold">Global Settings</h2>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">X Buffer Size:</label>
            <SoftNumberInput
              value={bufferSize}
              min={10}              //  lower bound
              max={5000}              //  upper bound
              step={1}
              withSteppers         // +/- buttons
              onChange={(n) => setBufferSize(n)}
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
              <SoftNumberInput
                value={minY}
                min={-5000}              // lower bound
                max={5000}              //  upper bound
                step={1}
                withSteppers         //  +/- buttons
                onChange={(e) => setMinY(Number(e))}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Max Y:</label>
              <SoftNumberInput
                value={maxY}
                min={-5000}              // lower bound
                max={5000}              //  upper bound
                step={1}
                withSteppers         //  +/- buttons
                onChange={(e) => setMaxY(Number(e))}
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



/**  -------Per-characteristic exclusive assignment UI ---------*/
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
  const autoSelectAll       = useGraphStore((s) => s.graphUi.autoSelectAll);
  const savedAssignments    = useGraphStore((s) => s.graphUi.waveformSelections[uuid]);
  const setWaveformSel      = useGraphStore((s) => s.setWaveformSelection);

  const { configs, removeConfig /* ...rest */ } = useGraphStore();

  // How many graphs to open for assignment (up to numberOfValues;)
  const [graphsCount, setGraphsCount] = useState(
    Math.min(1, Math.max(0, numberOfValues))
  );

  // assignments[graphIndex] = array of selected waveform indices (1..numberOfValues)
  const [assignments, setAssignments] = useState<Record<number, number[]>>({});
  const didInit = useRef(false);
  useEffect(() => {
  if (savedAssignments && Object.keys(savedAssignments).length > 0) {

    setAssignments(savedAssignments);
      // try to reflect the largest used graph index from saved selection
      const maxG = Math.max(
        0,
        ...Object.keys(savedAssignments).map((k) => Number(k) || 0)
      );
      if (maxG > 0) {
        setGraphsCount(Math.min(maxG, numberOfValues));
      }
    } else if (autoSelectAll && numberOfValues > 0) {
      if (didInit.current) return;
      if (numberOfValues <= 0) return;
      if (Object.keys(assignments).length > 0) return;
      // first-time UX: auto-select all into Graph 1 if allowed
      const all = Array.from({ length: numberOfValues }, (_, i) => i + 1);
      setAssignments({ 1: all });
      didInit.current = true;
      setGraphsCount(Math.min(1, numberOfValues));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAssignments, autoSelectAll, numberOfValues, uuid]);

  //  persist every change to assignments back into the store
  useEffect(() => {
    // avoid writing empty {} on first mount when nothing chosen and no autoSelectAll
    if (!assignments) return;
    setWaveformSel(uuid, assignments);
  }, [uuid, assignments, setWaveformSel]);

   // 1-based indices of waveforms already used in saved configs for this UUID
  const usedInExisting = useMemo(() => {
    const set = new Set<number>();
    for (const cfg of configs) {
      if (cfg.sourceUUID !== uuid) continue;
      for (const line of cfg.lines) {
        const idx =
          typeof line.byteIndex === "number" ? line.byteIndex : Number(line.byteIndex);
        if (!Number.isNaN(idx)) set.add(idx + 1); // UI is 1-based
      }
    }
    return set;
  }, [configs, uuid]);

  const freeFor = React.useCallback(
  (g: number) => {
    const taken = new Set<number>(usedInExisting);   // locked by existing saved configs
    // also block what other graphs in THIS panel already selected
    for (let i = 1; i <= graphsCount; i++) {
      if (i === g) continue;
      (assignments[i] ?? []).forEach((w) => taken.add(w));
    }
    // everything not taken is free
    return Array.from({ length: numberOfValues }, (_, i) => i + 1).filter(
      (w) => !taken.has(w)
    );
  },
  [usedInExisting, assignments, graphsCount, numberOfValues]
);

  // exclusivity toggle
  const toggle = (g: number, w: number) => {
    setAssignments((prev) => {
      const wasInG = (prev[g] ?? []).includes(w);
      if (usedInExisting.has(w) && !wasInG) return prev; // refuse taking a locked waveform
      // Start with a copy that removes w from all graphs (exclusivity)
      const next: Record<number, number[]> = {};
      const keys = new Set<number>([
        ...Object.keys(prev).map(Number),
        ...Array.from({ length: graphsCount }, (_, i) => i + 1),
      ]);

      for (const k of keys) {
        const arr = prev[k] ?? [];
        next[k] = arr.filter((x) => x !== w);
      }

      // If it wasn't in g before, add it now; if it was, we leave it removed (toggle off)
      if (!wasInG) {
        next[g] = [...(next[g] ?? []), w].sort((a, b) => a - b);
      }
      return next;
    });
  };

  // assign all waveforms to a specific graph (and remove from others)
  const selectAllFor = (g: number) => {
    setAssignments((prev) => {
      const next: Record<number, number[]> = {};
      // keep existing selections for all graphs
      for (let i = 1; i <= graphsCount; i++) next[i] = [...(prev[i] ?? [])];
      // compute allowed waveforms for this graph (won't steal from others)
      const allowed = freeFor(g);
      // set this graph to all allowed (you could also union with existing if you prefer)
      next[g] = allowed;
      return next;
    });
  };

  // clear only this graph's selection
  const clearFor = (g: number) => {
    setAssignments((prev) => ({ ...prev, [g]: [] }));
  };

  const removeAllGraphs = () => {
    if (configs.length === 0) return;
    if (!confirm(`Delete all ${configs.length} graphs?`)) return;
    configs.forEach((c) => removeConfig(c.id));
  };
  

  const usedAnywhereBut = (g: number, w: number) => {
    if (usedInExisting.has(w)) return true; // already in a saved graph region
    for (let i = 1; i <= graphsCount; i++) {
      if (i === g) continue;
      if ((assignments[i] ?? []).includes(w)) return true;
    }
    return false;
  };

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
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Graph {g}</h4>
                  <span className="text-xs text-muted-foreground">
                    Selected: {(assignments[g] ?? []).length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => selectAllFor(g)}>
                    Select all
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => clearFor(g)}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-5 gap-2">
                {Array.from({ length: numberOfValues }, (_, i) => i + 1).map((w) => {
                  const checked = (assignments[g] ?? []).includes(w);
                  const lock = usedAnywhereBut(g, w);
                  return (
                    <label
                      key={w}
                      className={`flex items-center gap-2 border rounded px-2 py-1 text-sm ${
                        lock && !checked ? "opacity-50" : ""
                      }`}
                      title={
                        lock && !checked
                          ? usedInExisting.has(w)
                            ? `Waveform ${w} is already used in another graph region`
                            : `Waveform ${w} is already assigned in another panel`
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
        <Button variant="danger" size="sm" onClick={removeAllGraphs}>
          🗑️ Delete all graphs
        </Button>
      </div>
    </div>
  );
}
