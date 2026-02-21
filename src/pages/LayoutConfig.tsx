import { useLayoutStore } from '../store/layoutStore';

export  function LayoutConfigPage() {
  const { config, setConfig } = useLayoutStore();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Layout Configuration</h1>
      <label>
        Graphs:
        <input
          type="number"
          value={config.graphs}
          min={0}
          onChange={(e) => setConfig({ ...config, graphs: +e.target.value })}
          className="ml-2 border px-2"
        />
      </label>
      <label>
        Videos:
        <input
          type="number"
          value={config.videos}
          min={0}
          onChange={(e) => setConfig({ ...config, videos: +e.target.value })}
          className="ml-2 border px-2"
        />
      </label>
      <label>
        Analysis Fields:
        <input
          type="number"
          value={config.fields}
          min={0}
          onChange={(e) => setConfig({ ...config, fields: +e.target.value })}
          className="ml-2 border px-2"
        />
      </label>
    </div>
  );
}
