import { useUIStore } from "../store/useUIStore";
import { useGraphStore } from "../store/useGraphStore";
import { Switch } from "@/components/ui/Switch";
import { ConfigLoadSaveWidget } from "../components/ConfigLoadSaveWidget";
import { useEffect } from "react";
import { apiPost } from "../hooks/api"

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

const BufferSizeControl = () => {
  const bufferSize = useGraphStore((s) => s.bufferSize);
  const setBufferSize = useGraphStore((s) => s.setBufferSize);

  const handleBufferSizeChange = (value: number) => {
    if (!isNaN(value)) {
      setBufferSize(value);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <label className="text-base">Buffer Size</label>
      <input
        type="number"
        min={10}
        max={50000}
        className="p-1 w-20 rounded border bg-muted text-foreground"
        value={bufferSize}
        onChange={(e) => handleBufferSizeChange(Number(e.target.value))}
        onBlur={() => {
          if (bufferSize < 10) handleBufferSizeChange(10);
          if (bufferSize > 50000) handleBufferSizeChange(50000);
        }}
      />
    </div>
  );
};

const YAxisControl = () => {
  const axis = useGraphStore((s) => s.axis);
  const setAxis = useGraphStore((s) => s.setAxis);

  return (
    <>
      <div className="flex items-center justify-between">
        <span>Y-Axis Auto Scale</span>
        <Switch 
          checked={!axis.fixed} 
          onCheckedChange={(checked) => setAxis({ fixed: !checked })} 
        />
      </div>
      
      {axis.fixed && (
        <>
          <div className="flex items-center justify-between">
            <label className="text-base">Y-Min</label>
            <input
              type="number"
              className="p-1 w-20 rounded border bg-muted text-foreground"
              value={axis.min}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val)) setAxis({ min: val });
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-base">Y-Max</label>
            <input
              type="number"
              className="p-1 w-20 rounded border bg-muted text-foreground"
              value={axis.max}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val)) setAxis({ max: val });
              }}
            />
          </div>
        </>
      )}
    </>
  );
};

const GraphSettings=() => {

  const showGrid = useUIStore((s) => s.showGrid);
  const toggleGrid = useUIStore((s) => s.toggleGrid);

  const graphWidth = useUIStore((s) => s.graphWidth);
  const graphHeight = useUIStore((s) => s.graphHeight);
  const setGraphWidth = useUIStore((s) => s.setGraphWidth);
  const setGraphHeight = useUIStore((s) => s.setGraphHeight);

  return (   

      <div className="border p-4 rounded-md space-y-4"
      style={{width:"33%"}}>
        <h2 className="text-xl font-bold">Graph Settings</h2>
        
        <BufferSizeControl />
        <YAxisControl />

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
      </div>
  );
};