import React, { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface BLEDevice {
  mac: string;
  name: string;
  rssi: number;
}

type GattCharacteristic = {
  name: string;
  path: string;
  uuid: string;
  properties: string[];
};

type GattService = {
  name: string;
  path: string;
  uuid: string;
  characteristics: GattCharacteristic[];
};

const GATT_LABELS: Record<string, string> = {
  "0000180d-0000-1000-8000-00805f9b34fb": "❤️ Heart Rate",
  "00001801-0000-1000-8000-00805f9b34fb": "🧩 Generic Attribute",
  "00001800-0000-1000-8000-00805f9b34fb": "📡 Generic Access",
  "0000dead-0000-1000-8000-00805f9b34fb": "🧪 Custom Service",
  "0000baad-0000-1000-8000-00805f9b34fb": "🧪 Debug Service",
};

const getLabel = (uuid: string) => GATT_LABELS[uuid.toLowerCase()] || uuid;

export const BLEConfig: React.FC = () => {
  const [bleDevices, setBleDevices] = useState<BLEDevice[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<BLEDevice[]>([]);
  const [gattMap, setGattMap] = useState<Record<string, GattService[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({});
  const [notificationMap, setNotificationMap] = useState<Record<string, boolean>>({});
  const [writeValues, setWriteValues] = useState<Record<string, string>>({});
  const [notificationValues, setNotificationValues] = useState<Record<string, string>>({});
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showScanned, setShowScanned] = useState(true);
  const [showConnected, setShowConnected] = useState(false);

  const toggleExpand = (mac: string) =>
    setExpanded((prev) => ({ ...prev, [mac]: !prev[mac] }));

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/ble/scan`);
      const data: BLEDevice[] = response.data;
      const filtered = data.filter(
        (d) => d.rssi !== -999 && !connectedDevices.some((cd) => cd.mac === d.mac)
      );
      setBleDevices(filtered);
      setShowScanned(true);
    } catch (err) {
      console.error("Scan failed", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (device: BLEDevice) => {
    setConnectionStatus((prev) => ({ ...prev, [device.mac]: "Connecting..." }));
    try {
      const res = await axios.post(`${BASE_URL}/api/ble/connect`, device);
      if (res.data) {
        setConnectedDevices((prev) => [...prev, device]);
        setConnectionStatus((prev) => ({ ...prev, [device.mac]: "Connected" }));
        setShowConnected(true);

        console.log("Connected to device:", device.mac);
        const services = await axios.get(`${BASE_URL}/api/ble/services/${device.mac}`);
        console.log("Services:", services.data);
        const cleaned = services.data.map((srv: GattService) => ({
          name: srv.name,
          path: srv.path,
          uuid: srv.uuid,
          characteristics: Array.isArray(srv.characteristics)
            ? srv.characteristics.filter((c) => c && c.uuid && Array.isArray(c.properties))
            : [],
        }));
        setGattMap((prev) => ({ ...prev, [device.mac]: cleaned }));
      }
    } catch {
      setConnectionStatus((prev) => ({ ...prev, [device.mac]: "Failed" }));
    }
  };

  const handleDisconnect = async (mac: string) => {
    try {
      await axios.post(`${BASE_URL}/api/ble/disconnect`, { mac }, {
        headers: { "Content-Type": "application/json" },
      });

      setConnectedDevices((prev) => prev.filter((d) => d.mac !== mac));
      setGattMap((prev) => {
        const { [mac]: _, ...rest } = prev;
        return rest;
      });
      setSelectedChars([]);
      setConnectionStatus((prev) => ({ ...prev, [mac]: "🔌 Disconnected" }));
      console.log("Disconnected from:", mac);
    } catch (error) {
      console.error("Disconnection failed:", error);
      setConnectionStatus((prev) => ({ ...prev, [mac]: "❌ Disconnection failed" }));
    }
  };


  const handleNotifyToggle = async (mac: string, path: string, uuid: string) => {
    const id = `${mac}-${path}-${uuid}`;
    console.log("Toggling notify for:", id);
    const next = !notificationMap[id];
    setNotificationMap((prev) => ({ ...prev, [id]: next }));

    try {
      await axios.post(`${BASE_URL}/api/ble/notify`, {
        mac,
        path,
        uuid,
        enable: next,
      });

      if (next) {
        // Fake notify stream (replace with real WebSocket later)
        const interval = setInterval(() => {
          setNotificationValues((prev) => ({
            ...prev,
            [id]: "🟢 Value at " + new Date().toLocaleTimeString(),
          }));
        }, 1000);
        // Optional: store `interval` to clear later
      } else {
        setNotificationValues((prev) => ({
          ...prev,
          [id]: "",
        }));
      }
    } catch (e) {
      console.error("Notify toggle failed:", e);
    }
  };

  const handleRead = async (mac: string, uuid: string) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/ble/read/mac=${mac}/uuid=${uuid}`);
      alert(`Read from ${uuid}: ${res.data.value}`);
    } catch {
      alert("Read failed");
    }
  };

  const handleWrite = async (mac: string, uuid: string) => {
    try {
      await axios.post(`${BASE_URL}/api/ble/write`, {
        mac,
        uuid,
        value: writeValues[`${mac}-${uuid}`] || "",
      });
      alert("Write success");
    } catch {
      alert("Write failed");
    }
  };

  const handleWriteInputChange = (mac: string, uuid: string, value: string) => {
    setWriteValues((prev) => ({ ...prev, [`${mac}-${uuid}`]: value }));
  };

  const toggleSelectChar = (cid: string) => {
    setSelectedChars((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  const enableSelectedNotify = async () => {
    for (const cid of selectedChars) {
      const [mac, path, uuid] = cid.split("-");
      await handleNotifyToggle(mac, path, uuid);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">BLE Configuration</h2>
        <div className="flex gap-2">
          <Button onClick={handleScan} disabled={isScanning}>
            {isScanning ? "🔄 Scanning..." : "🔍 Scan BLE Devices"}
          </Button>
          {bleDevices.length > 0 && (
            <Button variant="secondary" onClick={() => setShowScanned((s) => !s)}>
              {showScanned ? "🙈 Hide Scanned" : "📡 Show Scanned"}
            </Button>
          )}
        </div>
      </div>

      {/* Scanned Devices */}
      {showScanned && bleDevices.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">📡 Scanned Devices</h3>
          <table className="min-w-full border">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">MAC</th>
                <th className="text-left px-4 py-2">RSSI</th>
                <th className="text-left px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {bleDevices.map((d) => (
                <tr key={d.mac}>
                  <td className="px-4 py-2">{d.name || "Unnamed"}</td>
                  <td className="px-4 py-2">{d.mac}</td>
                  <td className="px-4 py-2">{d.rssi}</td>
                  <td className="px-4 py-2">
                    {connectedDevices.some((cd) => cd.mac === d.mac) ? (
                      <span className="text-green-600 font-medium text-sm">✅ Connected</span>
                    ) : (
                      <Button size="sm" onClick={() => handleConnect(d)}>
                        Connect
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Connected Devices */}
      {connectedDevices.length > 0 && (
        <div className="flex justify-between items-center mt-10">
          <h3 className="text-xl font-semibold">✅ Connected Devices</h3>
          <div className="flex gap-3">
            <Button variant="outline" onClick={enableSelectedNotify}>
              ✅ Enable Selected Notifications
            </Button>
            <Button variant="secondary" onClick={() => setShowConnected((s) => !s)}>
              {showConnected ? "🙈 Hide Connected" : "🧩 Show Connected"}
            </Button>
          </div>
        </div>
      )}

      {showConnected &&
        connectedDevices.map((dev) => (
          <div key={dev.mac} className="border rounded p-4 space-y-3 bg-muted">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{dev.name || "Unnamed"} ({dev.mac})</p>
                <p className="text-sm text-muted-foreground">
                  RSSI: {dev.rssi} | Status: {connectionStatus[dev.mac]}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => toggleExpand(dev.mac)}>
                  {expanded[dev.mac] ? "Hide GATT" : "Show GATT"}
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDisconnect(dev.mac)}>
                  🔌 Disconnect
                </Button>
              </div>
            </div>

            {expanded[dev.mac] && Array.isArray(gattMap[dev.mac]) && (
              
              <div className="space-y-4">
                {gattMap[dev.mac].map((srv) => (
                  <div key={srv.uuid} className="border p-3 rounded">
                    <p className="font-semibold">
                      🔹 {srv.name?.trim() ? srv.name : getLabel(srv.uuid)}
                    </p>
                    <p className="text-sm text-muted-foreground">UUID: {srv.uuid}</p>

                    {srv.characteristics.map((char) => {
                      const cid = `${dev.mac}-${char.uuid}`;
                      const checked = selectedChars.includes(cid);

                      return (
                        <div key={char.uuid} className="pl-4 mt-3 border-t pt-3 space-y-2">
                          <div className="flex gap-2 items-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelectChar(cid)}
                            />
                            <span className="text-sm font-medium">
                              {char.name ? `${char.name} (${char.uuid})` : char.uuid}
                            </span>
                          </div>

                          <div className="flex gap-2 flex-wrap items-center">
                            {char.properties.includes("read") && (
                              <Button size="sm" onClick={() => handleRead(dev.mac, char.uuid)}>
                                Read
                              </Button>
                            )}

                            {char.properties.includes("write") && (
                              <>
                                <Input
                                  placeholder="Write value"
                                  className="w-48"
                                  value={writeValues[cid] || ""}
                                  onChange={(e) =>
                                    handleWriteInputChange(dev.mac, char.uuid, e.target.value)
                                  }
                                />
                                <Button size="sm" onClick={() => handleWrite(dev.mac, char.uuid)}>
                                  Write
                                </Button>
                              </>
                            )}

                            {char.properties.includes("notify") && (
                              <Button
                                size="sm"
                                variant={notificationMap[cid] ? "primary" : "secondary"}
                                onClick={() => handleNotifyToggle(dev.mac,char.path, char.uuid)}
                              >
                                {notificationMap[cid] ? "Disable Notify" : "Enable Notify"}
                              </Button>
                            )}
                          </div>

                          {notificationValues[cid] && (
                            <div className="text-sm text-green-600 pt-2">
                              🔔 {notificationValues[cid]}
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground">
                            Properties: {char.properties.join(", ")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
    </div>
  );
};