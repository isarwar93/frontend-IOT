import { useMedicalStore } from "./useMedicalStore";
// import { useBLEStore, BLEDevice } from "@/store/useBLEStore";


export type WSKey = string; // `${mac}`
export const WS_BASE = import.meta.env.VITE_API_BASE_URL_WS ?? "";
export const HTTP_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

//TODO: Later Medical config, to set MAC address and characteristics to monitor
const MAC=import.meta.env.VITE_API_BASE_MAC|| "";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function apiGet<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${HTTP_BASE}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${res.statusText}`);
  return res.json();
}

async function apiPost<T = unknown, B = unknown>(path: string, body?: B, init?: RequestInit): Promise<T> {
  const res = await fetch(`${HTTP_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status} ${res.statusText}`);
  return res.json();
}

export const medReconnect = async () => {

  if (!MAC) {
    return "error: MAC address is not set";
  }
  const m = MAC;
  const s = useMedicalStore.getState();
  try {
    s.setError(null);
    s.setBlePhase("disconnecting");
    const p = await apiPost(`/api/ble/disconnect`, { mac: m });
    s.setLastPost(p);
    console.log("Disconnected from ", MAC);
    await new Promise((r) => setTimeout(r, 1000));

    s.setBlePhase("scanning");
    const scanResult = await apiGet(`/api/ble/scan`);
    s.setLastGet(scanResult);
    await new Promise((r) => setTimeout(r, 1000));
    if (!Array.isArray(scanResult)) {
      return "error: Scan data is not an array:";
    }
    s.setLastGet(scanResult);
    let found = false;
    let device = null;
    for (const item of scanResult) {
      //sometimes even disconnected from the cache it founds the device
      // therefore check the rssi, if rssi is less than -100 means disconnected
      if (item.mac === m && item.rssi > -100) {
        console.log("Found device in scan:", item);
        device = item;
        found = true;
        break;
      }
    }
    if (!found) {
      s.setBlePhase("NotFound");
      return "error: Device not found in scan";
    }
    s.setBlePhase("connecting");
    await new Promise((r) => setTimeout(r, 1000));
    const res = await apiPost(`/api/ble/connect`, { mac: m });
    s.setLastPost(res);

    
    s.setBlePhase("connected");
    return device;

    } catch (e: any) {
      console.error("Reconnect failed:", e);
      s.setBlePhase("error");
      s.setError(String(e?.message ?? e));
    }
}

export const medDisconnect = async () => {

  if (!MAC) {
    return false;
  }
  const m = MAC;
  const s = useMedicalStore.getState();
  try {
    s.setError(null);
    s.setBlePhase("disconnecting");
    const p = await apiPost(`/api/ble/disconnect`, { mac: m });
    s.setLastPost(p);
    console.log("Disconnected from ", MAC);
    await new Promise((r) => setTimeout(r, 1000));
    return true;

  } catch (e: any) {
    console.error("Reconnect failed:", e);
    s.setBlePhase("error");
    s.setError(String(e?.message ?? e));
    return false;
  }
}


export const graphStart = async () => {

  if (!MAC) {
    return "error: MAC address is not set";
  }
  const s = useMedicalStore.getState();
  if (s.blePhase !== "connected") {
    return "error: BLE not connected";
  }
  console.log("Finding available services", MAC);
  const m = MAC;
  try {
    s.setGraphPhase("scanning");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const services = await apiGet(`/api/ble/services/${m}`);
    console.log("Services:", services);
    s.setLastGet(services);

    if (!Array.isArray(services)) {
      s.setGraphPhase("error");
      return "error: Services data is not an array:";
    }
    s.setGraphPhase("starting");

    // For each service, fetch characteristics
    for (const srv of services) {
      for (const char of srv.characteristics) {
        if (Array.isArray(char.properties) && char.properties.includes("notify")) {
          // Enable notify on this characteristic
          try {
            console.log("Enabling notify for", char.name,char.path,char.uuid);
            const notifyResp = await apiPost(`/api/ble/notify`, {
              mac: m, 
              path: char.path, 
              uuid: char.uuid, 
              charName: char.name,
              enable: true
            });
            s.setLastPost(notifyResp);
          } catch (e) {
            console.error("Failed to enable notify for", char.uuid, e);
            s.setGraphPhase("error");
            return "error: Failed to enable notify for " + char.uuid;
          }
        } 
      }
    }

    s.setGraphPhase("running");

    return "started";
   
    } catch (e: any) {
      console.error("Reconnect failed:", e);
      s.setGraphPhase("error");
      s.setError(String(e?.message ?? e));
      return "error: " + String(e?.message ?? e);
    }
}

export const graphStop = async () => {
  if (!MAC) {
    return "error: MAC address is not set";
  }
  const s = useMedicalStore.getState();
  if (s.blePhase !== "connected") {
    return "error: BLE not connected";
  }
  console.log("Finding available services", MAC);
  const m = MAC;

  await new Promise((resolve) => setTimeout(resolve, 1000));

  s.setGraphPhase("stopping");
  
  const services = await apiGet(`/api/ble/services/${m}`);
  console.log("Services:", services);
  s.setLastGet(services);

  if (!Array.isArray(services)) {
    s.setGraphPhase("error");
    return "error: Services data is not an array:";
  }
  s.setGraphPhase("stopping");

  // For each service, fetch characteristics
  for (const srv of services) {
    for (const char of srv.characteristics) {
      if (Array.isArray(char.properties) && char.properties.includes("notify")) {
        // Disable notify on this characteristic
        try {
          console.log("Disabling notify for", char.name, char.path,char.uuid);
          const notifyResp = await apiPost(`/api/ble/notify`, {
            mac: m, 
            path: char.path,
            uuid: char.uuid,
            charName: char.name,
            enable: false
          });
          s.setLastPost(notifyResp);
        } catch (e) {
          console.error("Failed to disable notify for", char.uuid, e);
        }
      } 
    }
  }

  // we want to stop the websocket connection as well
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Finally set to stopped state
  
  s.setGraphPhase("stopped");
  return "stopped";
}