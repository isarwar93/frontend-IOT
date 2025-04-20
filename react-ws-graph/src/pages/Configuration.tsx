import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import { useUIStore } from "../store/useUIStore";
import { Button } from "@/components/ui/Button";



export const ConfigPage: React.FC = () => {

  const setSensors = useUIStore((s) => s.setSensors);

  const handleFetchSensors = () => {
    // simulate backend call for now
    const fakeSensors = [
      { id: 's1', name: 'Temperature Sensor', type: 'temperature', unit: '°C' },
      { id: 's2', name: 'Humidity Sensor', type: 'humidity', unit: '%' },
      { id: 's3', name: 'Voltage Probe', type: 'voltage', unit: 'V' },
    ];
    setSensors(fakeSensors);
  };


  const sensors = useUIStore((s) => s.sensors);



  const showGrid = useUIStore((s) => s.showGrid);
  const toggleGrid = useUIStore((s) => s.toggleGrid);


  const graphWidth = useUIStore((s) => s.graphWidth);
  const graphHeight = useUIStore((s) => s.graphHeight);
  const setGraphWidth = useUIStore((s) => s.setGraphWidth);
  const setGraphHeight = useUIStore((s) => s.setGraphHeight);


   // 👉 SAVE CONFIG HANDLER
   const handleSaveConfig = () => {
    const state = useUIStore.getState();
    const configBlob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(configBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ui-config.json";
    a.click();
  };

  // 👉 LOAD CONFIG HANDLER
  const handleLoadConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        useUIStore.getState().loadConfig(json); // Make sure `loadConfig` exists in your Zustand store
      } catch (err) {
        console.error("Invalid config file:", err);
      }
    };
    reader.readAsText(file);

  };


  return (
    <div className="p-6 space-y-6">


          <div className="flex gap-4 mb-4">
            <Button onClick={handleSaveConfig} variant="outline">
              💾 Save Config
            </Button>
            {/* border-border bg-muted hover:bg-accent */}
            <label className="border-primary-foreground bg-muted inline-flex items-center p-3 rounded-md">
              📂 Load Config
              <input
                type="file"
                accept=".json"
                onChange={handleLoadConfig}
                className="hidden"
              />
            </label>
                                
                <Button onClick={handleFetchSensors} variant="outline">
                    🔍 Discover Sensors
                </Button>
            </div>

            <ul className="mt-4 space-y-2 text-sm">
                  {sensors.map((sensor) => (
                    <li key={sensor.id} className="border rounded px-3 py-2 bg-muted">
                      <strong>{sensor.name}</strong> ({sensor.type}) — {sensor.unit}
                    </li>
                  ))}
                </ul>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      


      {/* Graph Settings */}
      <div className="border p-4 rounded-md space-y-4">
        <h2 className="text-xl font-bold">Graph Settings</h2>

        <div className="flex items-center justify-between">
          <span>Show Grid</span>
          <Switch checked={showGrid} onCheckedChange={toggleGrid} />
        </div>

        <div className="flex items-center justify-between">
          <span>Show Min</span>
          <Switch checked={useUIStore((s) => s.showMin)} onCheckedChange={useUIStore.getState().toggleMin} />
        </div>
        <div className="flex items-center justify-between">
          <span>Show Max</span>
          <Switch checked={useUIStore((s) => s.showMax)} onCheckedChange={useUIStore.getState().toggleMax} />
        </div>
        <div className="flex items-center justify-between">
          <span>Show Average</span>
          <Switch checked={useUIStore((s) => s.showAvg)} onCheckedChange={useUIStore.getState().toggleAvg} />
        </div>
        <div className="flex items-center justify-between">
          <span>Show Points</span>
          <Switch checked={useUIStore((s) => s.showPoints)} onCheckedChange={useUIStore.getState().togglePoints} />
        </div>



        <div className="flex items-center gap-6">
            {/* Width Input */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Width (%)</label>
              <input
                type="number"
                min={10}
                max={100}
                className="p-2 w-20 rounded border border-border bg-muted text-foreground"
                value={graphWidth}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val)) setGraphWidth(val);
                }}
                onBlur={() => {
                  if (graphWidth < 10) setGraphWidth(10);
                  if (graphWidth > 100) setGraphWidth(100);}}
              />
            </div>

            {/* Height Input */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Height (px)</label>
              <input
                type="number"
                min={100}
                max={1000}
                className="p-2 w-24 rounded border border-border bg-muted text-foreground"
                value={graphHeight}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val)) setGraphHeight(val);
                }}
                onBlur={() => {
                  if (graphHeight < 100) setGraphHeight(100);
                  if (graphHeight > 1000) setGraphHeight(1000);
                }}
              />
            </div>
          </div>





      </div>

      {/* Heatmap Settings */}
      <div className="border p-4 rounded-md">
        <h2 className="text-xl font-bold">Heatmap Settings</h2>
        {/* TODO */}
      </div>

      {/* Chat Settings */}
      <div className="border p-4 rounded-md">
        <h2 className="text-xl font-bold">Chat Settings</h2>
        {/* TODO */}
      </div>
    </div>
  </div>
  );
};

export default ConfigPage;
