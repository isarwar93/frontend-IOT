import { useUIStore } from "../store/useUIStore";
import { Switch } from "@/components/ui/Switch";
import { ConfigLoadSaveWidget } from "../components/ConfigLoadSaveWidget";
import { useEffect } from "react";
import { apiPost } from "../hooks/api";
import { useMedicalStore } from "../tabs-dashboard/medical/useMedicalStore";

export const SettingsPage = () => {
  const showFps = useUIStore((s) => s.showFps);
  const toggleFps = useUIStore((s) => s.toggleFps);

  
  const simulationState = useUIStore((s) => s.simulation);
  const toggleSimulation = useUIStore((s) => s.setSimulation);
  useEffect(() => { 
    console.log("simulationState changed:",simulationState);
          apiPost(`/api/settings/ble/simulate`, {
            simulation: simulationState
          });
  }, [simulationState]);


  return (
  <div className=" p-6 space-y-6">  
    <ConfigLoadSaveWidget />

    <div className="flex">
      <div className=" border p-4 rounded-md space-y-4 "
          style={{width:"33%"}}
      >
        <h2 className="text-xl font-bold">General Settings</h2>

        <div className="flex items-center justify-between">
            <span> Show FPS Counter</span>
            <Switch checked={showFps} onCheckedChange={toggleFps} />
        </div>
       
        <div className="flex items-center justify-between">
          <span>Simulation</span>
          <Switch checked={simulationState} onCheckedChange={toggleSimulation}
             />
        </div>
        <WebsocketFpsSettings/>

      </div>

      <GraphSettings/>
    </div>
  </div>
  );
};

const WebsocketFpsSettings = () => {
  const fps = useUIStore((s) => s.webSocketFps);
  const setFps = useUIStore((s) => s.setWebSocketFps);

  const handleFpsChange = (value: number) => {
    if (!isNaN(value)) {
      setFps(value);
      // Send FPS update through API
      apiPost('/api/settings/websocket/fps', {
        wsfps: value
      });
    }
  };

  return (
    <div className="flex items-center justify-between">
        <label className="text-base">Websocket FPS</label>
        <input
          type="number"
          min={1}
          max={500}
          className="p-1 w-20 rounded border bg-muted text-foreground"
          value={fps}
          onChange={(e) => handleFpsChange(Number(e.target.value))}
          onBlur={() => {
            if (fps < 1) handleFpsChange(1);
            if (fps > 500) handleFpsChange(500);
          }}
        />
    </div>
  );
};

const BufferSizeSettings = () => {
  const bufferSize = useMedicalStore((s) => s.medicalBufferSize);
  const setBufferSize = useMedicalStore((s) => s.setMedicalBufferSize);

  const handleBufferSizeChange = (value: number) => {
    if (!isNaN(value)) {
      setBufferSize(value);
    }
  };

  return (
    <div className="flex items-center justify-between">
        <label className="text-base">X-Axis Size</label>
        <input
          type="number"
          min={512}
          max={8192}
          step={512}
          className="p-1 w-20 rounded border bg-muted text-foreground"
          value={bufferSize}
          onChange={(e) => handleBufferSizeChange(Number(e.target.value))}
          onBlur={() => {
            if (bufferSize < 512) handleBufferSizeChange(512);
            if (bufferSize > 8192) handleBufferSizeChange(8192);
          }}
        />
    </div>
  );
};

const GraphSettings=() => {

  const graphWidth = useUIStore((s) => s.graphWidth);
  const graphHeight = useUIStore((s) => s.graphHeight);
  const setGraphWidth = useUIStore((s) => s.setGraphWidth);
  const setGraphHeight = useUIStore((s) => s.setGraphHeight);

  return (   

      <div className="border p-4 rounded-md space-y-4"
      style={{width:"33%"}}>
        <h2 className="text-xl font-bold">Graph Settings</h2>

            {/* Width Input */}
            <div className="flex items-center justify-between">
              <label className="text-base">Width (%)</label>
              <input
                type="number"
                min={10}
                max={100}
                className="p-1 w-20 rounded border bg-muted text-foreground"
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
            <div className="flex items-center justify-between">
              <label className="text-base">Height (px)</label>
              <input
                type="number"
                min={100}
                max={1000}
                className="p-1 w-20 rounded border bg-muted text-foreground"
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
        <BufferSizeSettings/>
      </div>
  );
};