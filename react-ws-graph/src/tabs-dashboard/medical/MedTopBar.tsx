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
    <div className="flex flex-col gap-1 rounded-md border p-1 bg-background">
      {/* Top row: device + graph + reconnect */}
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="text-sm">
          <div className="font-medium">
            Device MAC:&nbsp;
            <span className="text-muted-foreground">{mac!==""?mac: "- (no device)"} 
              &nbsp; - Status:&nbsp;{(blePhase || "—")} | Graph:&nbsp;{(graphPhase || "—")}
            </span>
          </div>
        </div>

        <div className="flex gap-1">
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