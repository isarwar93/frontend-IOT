// src/lib/websocket.ts
import { use } from "react";
import { useDataStore } from "./useMedicalStore";


type WSKey = string; // `${mac}`
const WS_BASE = import.meta.env.VITE_API_BASE_URL_WS ?? "";
const HTTP_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

//TODO: Later Medical config, to set MAC address and characteristics to monitor
const MAC=import.meta.env.VITE_API_BASE_MAC|| "";


let channels: ReturnType<typeof useDataStore.getState>["channels"] = [];
export function initChannels(names: string[], size = 2048) {
  channels = names.map((name) => ({
    name,
    buffer: new Float32Array(size),
    head: 0,
    min: 0,
    max: 0,
    avg: 0, 
    updated: false
  }));

  // Register references in Zustand (React can read them)
  useDataStore.getState().setChannels(channels);
}


export function addValues(name: string, current: number, values: number[], max: number, min: number, avg: number) {
  const ch = channels.find((c) => c.name === name);
  if (!ch) return;
     
  const idx = ch.head % ch.buffer.length;
  ch.buffer[idx] = current;
  ch.head++;
  for (const value of values) {
    const idx = ch.head % ch.buffer.length;
    ch.buffer[idx] = value;
    ch.head++;
  }
  // ch.max = max;
  // ch.min = min;
  // ch.avg = avg;
  // ch.updated = true;
  // Update Zustand store
  useDataStore.getState().updateMinMaxAvg(name, max, min, avg);
  useDataStore.getState().updated(name, true);
  useDataStore.getState().updateHead(name, ch.head);

  // console.log("channel after addValues:", name, ch);
}

// export function addValue(name: string, value: number) {
//   const ch = channels.find((c) => c.name === name);
//   if (!ch) return;

//   const idx = ch.head % ch.buffer.length;
//   ch.buffer[idx] = value;
//   ch.head++;
//   // Update Zustand store
//   useDataStore.getState().updateHead(name, ch.head);
// }


let ws: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000; // 2 seconds

export function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return ws;
  const key: WSKey = MAC; 

  const safeMac = key.replace(/:/g, "_");
  const url = `${WS_BASE}/ws/ble/graph/mac=${encodeURIComponent(safeMac)}`;

  console.log(`Attempting to connect to WebSocket: ${url}`);
  
  ws = new WebSocket(url);
  
  ws.onopen = () => {
    console.log("WebSocket connected successfully");
    reconnectAttempts = 0; // Reset on successful connection
  };
  
  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
  
  ws.onclose = (event) => {
    console.log("WebSocket closed:", event.code, event.reason);
    ws = null;
    
    // Attempt to reconnect if not manually closed
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && event.code !== 1000) {
      reconnectAttempts++;
      console.log(`Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY}ms...`);
      
      reconnectTimer = setTimeout(() => {
        connectWebSocket();
      }, RECONNECT_DELAY);
    } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("Max reconnection attempts reached. Please check your connection.");
    }
  };
  
  ws.onmessage = (ev) => {
    try {
      const m = JSON.parse(typeof ev.data === "string" ? ev.data : "");
      const data = m?.websocket_data || m;
      const sensors = data?.sensors || {};


      for (const sensorName in sensors) {
        const sensorData = sensors[sensorName];
        const current = sensorData?.current || null;
        const past_values = sensorData?.past_values || [];
        const max = sensorData?.max || null;
        const min = sensorData?.min || null;
        const avg = sensorData?.avg || null;
        addValues(sensorName,current, past_values, max, min, avg);

      }


      // const name = "ecg"; 
  
      // const received_list = sensors?.ecg;
      // const avg = received_list?.avg || 0;
      // const min = received_list?.min || 0;
      // const max = received_list?.max || 0;
      // const past_values = received_list?.past_values || [];
      // addValues(name, past_values,max,min,avg);

      // const name_hr = "heart_rate"; 
      // const received_list_hr = sensors?.heart_rate;
      // const avg_hr = received_list_hr?.avg || 0;
      // const min_hr = received_list_hr?.min || 0;
      // const max_hr = received_list_hr?.max || 0;
      // const past_values_hr = received_list_hr?.past_values || [];
      // addValues(name_hr, past_values_hr,max_hr,min_hr,avg_hr);

      // const name_rr = "respiration_rate"; 
      // const received_list_rr = sensors?.respiration_rate;
      // const avg_rr = received_list_rr?.avg || 0;
      // const min_rr = received_list_rr?.min || 0;
      // const max_rr = received_list_rr?.max || 0;
      // const past_values_rr = received_list_rr?.past_values || [];
      // addValues(name_rr, past_values_rr,max_rr,min_rr,avg_rr);

      // // find other sensor values similarly...
      // const name_bp = "blood_pressure"; 
      // const received_list_bp = sensors?.blood_pressure;
      // const avg_bp = received_list_bp?.avg || 0;
      // const min_bp = received_list_bp?.min || 0;
      // const max_bp = received_list_bp?.max || 0;
      // const past_values_bp = received_list_bp?.past_values || [];
      // addValues(name_bp, past_values_bp,max_bp,min_bp,avg_bp);

      // const name_body_temp = "body_temperature"; 
      // const received_list_body_temp = sensors?.body_temperature;
      // const avg_body_temp = received_list_body_temp?.avg || 0;
      // const min_body_temp = received_list_body_temp?.min || 0;
      // const max_body_temp = received_list_body_temp?.max || 0;
      // const past_values_body_temp = received_list_body_temp?.past_values || [];
      // addValues(name_body_temp, past_values_body_temp,max_body_temp,min_body_temp,avg_body_temp);


    } catch { /* ignore malformed frames */ }
  };
  return ws;
}

export function disconnectWebSocket() {
  // Clear any pending reconnection attempts
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
  
  try { 
    if (ws) {
      ws.onclose = null; // Prevent reconnection on manual disconnect
      ws.close(1000, "Manual disconnect"); // 1000 = normal closure
    }
  } catch (error) {
    console.error("Error closing WebSocket:", error);
  }
  // // clean all buffers
  // channels = [];
  // useDataStore.getState().setChannels([]);

  ws = null;
}
