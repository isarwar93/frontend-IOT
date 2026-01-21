import {useState } from "react";
import { Button } from "@/components/ui/Button";
import { BLEDevice,useBLEStore } from "@/store/useBLEStore";
import { medDisconnect,medReconnect,graphStart,graphStop } from "./MedComm";
import { connectWebSocket, disconnectWebSocket } from "./MedWebSocket";
import { useMedicalStore } from "@/tabs-dashboard/medical/useMedicalStore";
import { useUIStore } from "@/store/useUIStore";


export default function MedTopBar() {
  const {
    // Full BLE state (shared with BLEConfig)
    bleDevices, setBleDevices,
    connectedDevices, setConnectedDevices,
    connectionStatus, setConnectionStatus,
  } = useBLEStore();
  const [webSocketConnected, setWebSocketConnected] = useState(false);
  const simulationState = useUIStore((s) => s.simulation);
  const { blePhase, graphPhase} = useMedicalStore();
  const [bleConnected, setBleConnected] = useState(false);
  const [graphRunning, setGraphRunning] = useState(false);

  let mac = connectedDevices?.[0]?.mac

  

  // --- Reconnect current device (disconnect + connect + fetch services) ---
  const reconnect = async () => {
    setBleConnected(false);
    const g = await medReconnect();
    if (!g) return;
    if (g.toString().startsWith("error")) {
      return;
    }
    setBleDevices(g);
    let obj: BLEDevice = {mac:g.mac,name:g.name,rssi:g.rssi};
    console.log("BLE Device Object: ", obj);
    mac = obj.mac;

    setConnectedDevices([obj, ...connectedDevices]);
    setConnectionStatus({ ...connectionStatus, [g.mac]: "Connected" });

    if (blePhase === "error" || blePhase === "disconnected") {
      setBleConnected(false);
      return;
    } 
    setBleConnected(true);
    return;
  };

  // --- Reconnect current device (disconnect + connect + fetch services) ---
  const disconnect = async () => {
    setBleConnected(false);
    const g = await medDisconnect();
    if (g === false) { 
      return;
    }
    let obj: BLEDevice = {mac:"",name:"",rssi:0};
    setConnectedDevices([obj, ...connectedDevices]);
    setBleConnected(false);
    return;
  };

  const startGraph = async() => {
    // stopGraph(); // ensure stopped first
    const g = await graphStart();
    console.log("Graph Start Result: ", g);
    if (g.toString().startsWith("error")) {
      return;
    }
    setGraphRunning(true);
    // const cid = `${mac}|${path}|${uuid}`;
  };
  const stopGraph = async() => {
    const g = await graphStop();
    console.log("Graph Stop Result: ", g);
    if (g.toString().startsWith("error")) {
      return;
    }
    setGraphRunning(false);
  };

  const startSimulation = async() => {
    const g = await connectWebSocket();
    if (g.toString().startsWith("error")) {
      return;
    }
    setWebSocketConnected(true);
  };
  const stopSimulation = async() => {
    const g = await disconnectWebSocket();
    if (g!) {
      return;
    }
    setWebSocketConnected(false);
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border-2 border-blue-500/20 dark:border-cyan-500/30 p-2 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950 shadow-lg">
      {/* Top row: device + graph + reconnect */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-950/50 rounded-lg border border-blue-300 dark:border-blue-700">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              bleConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
            }`}></div>
            <span className="text-xs font-semibold text-blue-900 dark:text-blue-100">Device</span>
          </div>
          <div className="text-xs font-mono">
            <span className="text-slate-600 dark:text-slate-400">MAC:</span>&nbsp;
            <span className="font-semibold text-blue-700 dark:text-cyan-400">{mac!==""?mac: "Not Connected"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600">
              <span className="text-slate-600 dark:text-slate-400">BLE:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{blePhase || "—"}</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600">
              <span className="text-slate-600 dark:text-slate-400">Graph:</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">{graphPhase || "—"}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {
          graphRunning?null:(<Button onClick={reconnect} 
              size="sm"
              variant="secondary">Reconnect
          </Button>)
          }
          {
          graphRunning?null:(bleConnected? (<Button onClick={disconnect} 
              size="sm"
              variant="secondary">Disconnect
          </Button>):
          (<Button onClick={disconnect} 
              size="sm"
              variant="outline"
              disabled>Disconnect
          </Button>))
          }
          {/* Start / Stop Graph */}
          {bleConnected?(graphRunning ? (
            <Button 
              variant="outline" onClick={startGraph} disabled size="sm" >
              Start
            </Button>
          ) : (
            <Button variant="secondary" onClick={startGraph} size="sm">
              Start
            </Button>
          )):(null)
        }
        {bleConnected?(graphRunning ? (
            <Button 
              variant="secondary" onClick={stopGraph} size="sm">
              Stop
            </Button>
          ) : (
            <Button variant="outline" onClick={stopGraph} disabled size="sm">
              Stop
            </Button>
          )):(null)
        }
        {simulationState?(webSocketConnected? (
            <Button 
              variant="outline" onClick={stopSimulation} size="sm">
              Stop Simulation
            </Button>
          ):(
            <Button 
              variant="secondary" onClick={startSimulation} size="sm">
              Start Simulation
            </Button>
          )):(null)
        }

        </div>
      </div>
    </div>
  );
}