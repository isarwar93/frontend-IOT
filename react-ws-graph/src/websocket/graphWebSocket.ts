
// import { useEffect, useRef } from "react";
// import { GraphData } from "../../types";
// import { useUIStore } from "@/store/useUIStore";

// const BASE_URL = import.meta.env.VITE_API_BASE_URL_WS;  // Change to your backend's IP/Port

// interface Props {
//   mac: string;
//   uuid: string;
//   onGraphData: (data: GraphData) => void;
//   onConnect: () => void;
//   onDisconnect: () => void;
//   paused: boolean;
// }

// export const useWebSockets = ({
//   mac,
//   uuid,
//   onGraphData,
//   onConnect,
//   onDisconnect,
//   paused,
// }: Props) => {
//  // const mac = useUIStore((state) => state.mac); // watch reactively
//   const graphRef = useRef<WebSocket | null>(null);
//   const pausedRef = useRef(false);

//   // Keep paused state in ref to avoid stale closure
//   useEffect(() => {
//     pausedRef.current = paused;
//   }, [paused]);

//   const formatTimestamp = (timestamp: number) =>
//     new Date(timestamp).toLocaleTimeString();

//   // Auto-connect only when both username and nickname are available
//   useEffect(() => {
//     if (!mac || mac.trim() === "") {
//       console.warn("WebSocket not connected: username is empty");
//       return;
//     }

//     if (!uuid || uuid.trim() === "") {
//       console.warn("WebSocket not connected: nickname is empty");
//       return;
//     }
//     //ws/ble/graph/mac=${mac}/uuid=${uuid}
//     const graphUrl = `${BASE_URL}/ws/ble/graph/
//     mac=${encodeURIComponent(mac)}/
//     uuid=${encodeURIComponent(uuid)}`;

//     // Create WebSocket connections
//     graphRef.current = new WebSocket(graphUrl);


//     // Graph WebSocket events
//     graphRef.current.onopen = () => {
//       onConnect();
//       console.log("Graph Ble websocket connected");
//     };


//     graphRef.current.onmessage = (e) => {
//       console.log("Graph Ble websocket data received:", e.data);
//       if (pausedRef.current) return;
//       try {
//         const data = JSON.parse(e.data);
//         const formatted: GraphData = {
//           timestamp: formatTimestamp(data.timestamp),
//           value: data.value,
//         };
//         onGraphData(formatted);
//       } catch (err) {
//         console.error("Invalid graph data", err);
//       }
//     };
//     graphRef.current.onclose = () => onDisconnect();

//     // Clean up sockets on unmount or username change
//     return () => {
//       graphRef.current?.close();
//     };
//   }, [mac, uuid]); // Only reconnect if these change

//   // Send message
//   const sendMessage = (msg: string) => {
//     if (graphRef.current?.readyState === WebSocket.OPEN) {
//       graphRef.current.send(msg);
//     }
//   };

//   // Manual disconnect (optional)
//   const disconnect = () => {
//     console.log("Disconnecting Graph WebSocket");
//     graphRef.current?.close();
//   };

//   return { sendMessage, disconnect };
// };


// src/hooks/useWebSockets.ts
import { useEffect, useRef } from "react";
import { GraphData } from "../../types";

const RAW_BASE = import.meta.env.VITE_API_BASE_URL_WS || import.meta.env.VITE_API_BASE_URL || "";

/** Normalize http(s) -> ws(s), remove trailing slashes. */
function toWsBase(base: string): string {
  if (!base) return window.location.origin.replace(/^http/, "ws");
  try {
    const u = new URL(base);
    if (u.protocol === "http:") u.protocol = "ws:";
    if (u.protocol === "https:") u.protocol = "wss:";
    return u.toString().replace(/\/+$/, "");
  } catch {
    // If someone already passes ws://... keep it and just strip trailing slash
    return base.replace(/\/+$/, "");
  }
}

const WS_BASE = toWsBase(RAW_BASE);

interface Props {
  mac: string;
  uuid: string;
  onGraphData: (data: GraphData) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  paused?: boolean;
}

/**
 * Opens a WebSocket: `${WS_BASE}/ws/ble/graph/mac=<mac>/uuid=<uuid>`
 * Expects messages as JSON: { timestamp: number | string, value: number }
 */
export const useWebSockets = ({
  mac,
  uuid,
  onGraphData,
  onConnect,
  onDisconnect,
  paused = false,
}: Props) => {
  const wsRef = useRef<WebSocket | null>(null);
  const pausedRef = useRef<boolean>(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Format both numeric-epoch and ISO strings to local time
  const formatTimestamp = (t: number | string) => {
    if (typeof t === "number") return new Date(t).toLocaleTimeString();
    const maybe = Number(t);
    if (!Number.isNaN(maybe)) return new Date(maybe).toLocaleTimeString();
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? new Date().toLocaleTimeString() : d.toLocaleTimeString();
  };

  useEffect(() => {
    if (!mac?.trim()) {
      console.warn("WebSocket not connected: mac is empty");
      return;
    }
    if (!uuid?.trim()) {
      console.warn("WebSocket not connected: uuid is empty");
      return;
    }

    const url = `${WS_BASE}/ws/ble/graph/mac=${encodeURIComponent(mac)}/uuid=${encodeURIComponent(uuid)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      onConnect?.();
      // console.debug("Graph BLE WebSocket connected:", url);
    };

    ws.onmessage = (e) => {
      if (pausedRef.current) return;
      try {
        const msg = JSON.parse(e.data);
        const data: GraphData = {
          timestamp: formatTimestamp(msg.timestamp),
          value: Number(msg.value),
        };
        if (!Number.isNaN(data.value)) onGraphData(data);
      } catch (err) {
        console.error("Invalid graph data:", err);
      }
    };

    ws.onclose = () => {
      onDisconnect?.();
      wsRef.current = null;
    };

    ws.onerror = () => {
      // onclose will run as well
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [mac, uuid]);

  const sendMessage = (msg: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
    }
  };

  const disconnect = () => {
    wsRef.current?.close();
  };

  return { sendMessage, disconnect };
};
