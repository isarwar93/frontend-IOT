// src/components/StreamControlBar.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import { useBLEStore } from "@/store/useBLEStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Optional wiring in GraphEngine.tsx:
 * -----------------------------------
 * Add these listeners once so Start/Stop controls your sockets:
 *
 * useEffect(() => {
 *   const onStart = () => connectAll();
 *   const onStop  = () => disconnectAll();
 *   window.addEventListener("graph:start", onStart);
 *   window.addEventListener("graph:stop", onStop);
 *   return () => {
 *     window.removeEventListener("graph:start", onStart);
 *     window.removeEventListener("graph:stop", onStop);
 *   };
 * }, []);
 */

type BLEDevice = { mac: string; name: string; rssi: number };
type GattCharacteristic = { name: string; path: string; uuid: string; properties: string[] };
type GattService = { name: string; path: string; uuid: string; characteristics: GattCharacteristic[] };

export default function StreamControlBar() {
  const {
    // Full BLE state (shared with BLEConfig)
    bleDevices, setBleDevices,
    connectedDevices, setConnectedDevices,
    gattMap, setGattMap,
    connectionStatus, setConnectionStatus,
    notifications, setNotifications,
    notifValues, setNotifValues,
    charValues, setCharValues,
    selectedChars, setSelectedChars,
  } = useBLEStore();

  // current device == first connected
  const current = useMemo<BLEDevice | undefined>(() => connectedDevices?.[0], [connectedDevices]);
  const mac = current?.mac;

  // local graph running indicator (can be driven by GraphEngine via "graph:state")
  const [graphRunning, setGraphRunning] = useState(false);
  useEffect(() => {
    const onGraphState = (e: Event) => {
      const ce = e as CustomEvent<{ running: boolean }>;
      if (typeof ce?.detail?.running === "boolean") setGraphRunning(ce.detail.running);
    };
    window.addEventListener("graph:state", onGraphState);
    return () => window.removeEventListener("graph:state", onGraphState);
  }, []);

  const startGraph = () => {
    window.dispatchEvent(new CustomEvent("graph:start"));
    setGraphRunning(true);
  };
  const stopGraph = () => {
    window.dispatchEvent(new CustomEvent("graph:stop"));
    setGraphRunning(false);
  };

  // --- Notify toggle (identical behavior to BLEConfig) ---
  const toggleNotify = async (mac: string, path: string, uuid: string, charName: string | undefined) => {
    const id = `${mac}-${path}-${uuid}`;
    const next = !notifications[id];

    try {
      const res = await axios.post(`${BASE_URL}/api/ble/notify`, {
        mac, path, uuid, enable: next,
      });

      // Parse backend response (same parsing BLEConfig does)
      let message = "";
      let status = "";
      let numberOfValues = 0;
      if (Array.isArray(res.data) && res.data[0]?.stringValue) {
        try {
          const parsed = JSON.parse(res.data[0].stringValue);
          message = String(parsed.message || "").toLowerCase();
          status = parsed.status || "";
          numberOfValues = parsed.number_of_values || 0;
        } catch {}
      }

      // Save/refresh char meta (name + value count)
      // setCharValues({
      //   ...charValues,
      //   [id]: { name: charName || charValues[id]?.name || uuid, numberOfValues },
      // });

      if (status === "success" && message.includes("enabled")) {
        setNotifications({ ...notifications, [id]: true });
        if (!selectedChars.includes(id)) setSelectedChars([...selectedChars, id]);
        setNotifValues({ ...notifValues, [id]: "🟢 Value at " + new Date().toLocaleTimeString() });
      } else if (status === "success" && message.includes("disabled")) {
        setNotifications({ ...notifications, [id]: false });
        setNotifValues({ ...notifValues, [id]: "" });
      }
    } catch (e) {
      console.error("Notify toggle failed:", e);
    }
  };

  // --- List all characteristics (of current MAC) that support "notify" ---
  const notifiable = useMemo(() => {
    if (!mac) return [] as Array<{ cid: string; title: string; path: string; uuid: string }>;
    const services: GattService[] = gattMap[mac] || [];
    const items: Array<{ cid: string; title: string; path: string; uuid: string }> = [];

    for (const s of services) {
      for (const c of s.characteristics) {
        if (!Array.isArray(c.properties) || !c.properties.includes("notify")) continue;
        const cid = `${mac}-${c.path}-${c.uuid}`;
        const storedName = charValues[cid]?.name;
        const title = (storedName && storedName.trim()) || c.name || c.uuid;
        items.push({ cid, title, path: c.path, uuid: c.uuid });
      }
    }
    return items;
  }, [mac, gattMap, charValues]);

  // --- Reconnect current device (disconnect + connect + fetch services) ---
  const reconnect = async () => {
    if (!current?.mac) return;
    const m = current.mac;

    try {
      await axios.post(`${BASE_URL}/api/ble/disconnect`, { mac: m }, {
        headers: { "Content-Type": "application/json" },
      });
      setConnectedDevices(connectedDevices.filter((d) => d.mac !== m));
      const { [m]: _drop, ...rest } = gattMap;
      setGattMap(rest);
      setSelectedChars(selectedChars.filter((cid) => !cid.startsWith(`${m}-`)));
      setConnectionStatus({ ...connectionStatus, [m]: "🔌 Disconnected" });
    } catch (e) {
      console.warn("Disconnect during reconnect failed:", e);
    }

    // Reuse metadata if not found in bleDevices
    const device: BLEDevice = bleDevices.find((d) => d.mac === m) || current;

    setConnectionStatus({ ...connectionStatus, [m]: "Connecting..." });
    try {
      const cRes = await axios.post(`${BASE_URL}/api/ble/connect`, device);
      if (cRes.data) {
        setConnectedDevices([device, ...connectedDevices.filter((d) => d.mac !== m)]);
        setConnectionStatus({ ...connectionStatus, [m]: "Connected" });

        // Give adapter a moment to expose GATT, then fetch services
        await new Promise((r) => setTimeout(r, 1000));
        let servicesResp = await axios.get(`${BASE_URL}/api/ble/services/${m}`);

        if (!Array.isArray(servicesResp.data) || servicesResp.data.length === 0) {
          // retry sequence similar to BLEConfig’s workaround
          await new Promise((r) => setTimeout(r, 800));
          await axios.post(`${BASE_URL}/api/ble/disconnect`, { mac: m }, { headers: { "Content-Type": "application/json" }});
          await new Promise((r) => setTimeout(r, 800));
          await axios.post(`${BASE_URL}/api/ble/connect`, device);
          await new Promise((r) => setTimeout(r, 800));
          servicesResp = await axios.get(`${BASE_URL}/api/ble/services/${m}`);
          if (!Array.isArray(servicesResp.data) || servicesResp.data.length === 0) {
            setConnectionStatus({ ...connectionStatus, [m]: "⚠️ No services" });
            return;
          }
        }

        const cleaned: GattService[] = servicesResp.data.map((srv: GattService) => ({
          name: srv.name,
          path: srv.path,
          uuid: srv.uuid,
          characteristics: Array.isArray(srv.characteristics)
            ? srv.characteristics.filter((c) => c && c.uuid && Array.isArray(c.properties))
            : [],
        }));
        setGattMap({ ...gattMap, [m]: cleaned });
      }
    } catch (e) {
      console.error("Reconnect failed:", e);
      setConnectionStatus({ ...connectionStatus, [m]: "❌ Reconnect failed" });
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3 bg-background">
      {/* Top row: device + graph + reconnect */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <div className="font-medium">
            Device MAC:&nbsp;
            <span className="text-muted-foreground">{mac ?? "— (no device)"}</span>
          </div>
          <div className="text-muted-foreground">
            Status:&nbsp;{mac ? (connectionStatus[mac] || "—") : "—"}
          </div>
        </div>

        <div className="flex gap-2">
          {/* Start / Stop Graph */}
          {graphRunning ? (
            <Button variant="outline" onClick={stopGraph}>
              ⏹ Stop Graph
            </Button>
          ) : (
            <Button variant="secondary" onClick={startGraph} disabled={!mac}>
              ▶️ Start Graph
            </Button>
          )}

          {/* Reconnect */}
          <Button onClick={reconnect} disabled={!mac}>
            🔄 Reconnect Bluetooth
          </Button>
        </div>
      </div>

      {/* Notify toggles — only for characteristics that support "notify" */}
      <div className="flex flex-wrap gap-2">
        {notifiable.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No notifiable characteristics found for this device.
          </div>
        ) : (
          notifiable.map(({ cid, title, path, uuid }) => {
            const enabled = !!notifications[cid];
            return (
              <Button
                key={cid}
                size="sm"
                variant={enabled ? "secondary" : "outline"}
                onClick={() => mac && toggleNotify(mac, path, uuid, title)}
                title={enabled ? `Disable notify for ${title}` : `Enable notify for ${title}`}
              >
                {enabled ? `🔔 Disable • ${title}` : `🔕 Enable • ${title}`}
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
}
