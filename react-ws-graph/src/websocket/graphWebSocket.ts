

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
