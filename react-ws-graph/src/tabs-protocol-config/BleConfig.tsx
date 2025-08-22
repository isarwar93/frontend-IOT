import React, { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useGraphStore } from "@/store/useGraphStore";
import { useBLEStore } from "@/store/useBLEStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// function handleBLE(uuid: string, payload: string) {
//   const json = JSON.parse(payload);
//   const configs = useGraphStore.getState().configs.filter(c => c.sourceUUID === uuid);

//   for (const cfg of configs) {
//     const point: Record<string, number> = {};
//     for (const line of cfg.lines) {
//       const val = Array.isArray(json)
//         ? json[parseInt(line.byteIndex as string)]
//         : json[line.byteIndex];
//       if (typeof val === "number") point[line.label] = val;
//     }
//     useGraphStore.getState().pushData(cfg.id, point);
//   }
// }


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
  const {
    bleDevices, setBleDevices,
    connectedDevices, setConnectedDevices,
    gattMap, setGattMap,
    expandedDevices, setExpandedDevices,
    connectionStatus, setConnectionStatus,
    notifications, setNotifications,
    notifValues, setNotifValues,
    charValues, setCharValues,
    writeValues, setWriteValues,
    selectedChars, setSelectedChars,
    isScanning, setIsScanning,
    showScanned, setShowScanned,
    showConnected, setShowConnected,
  } = useBLEStore();



  const toggleExpand = (mac: string) =>
     setExpandedDevices({ ...expandedDevices, [mac]: !expandedDevices[mac] });

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
    setConnectionStatus({ ...connectionStatus, [device.mac]: "Connecting..." });
    try {
      const res = await axios.post(`${BASE_URL}/api/ble/connect`, device);
      if (res.data) {
        setConnectedDevices([...connectedDevices, device]);
        setConnectionStatus({ ...connectionStatus, [device.mac]: "Connected" });
        setShowConnected(true);

        console.log("Connected to device:", device.mac);
        // Without this delay, the GATT services might not be ready immediately
        // FIXME: (in backend) This is a workaround, ideally it should be available immediately

        await new Promise((resolve) => setTimeout(resolve, 2000));
        const services = await axios.get(`${BASE_URL}/api/ble/services/${device.mac}`);
        console.log("Services:", services.data);
        // if service array is empty, try reconnecting and then fetching services again
        if (!Array.isArray(services.data) || services.data.length === 0) {
          console.warn("No services found, retrying connection...");
          // Wait for disconnection before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await handleDisconnect(device.mac);
          //wait for 1 second before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const res = await axios.post(`${BASE_URL}/api/ble/connect`, device);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const services = await axios.get(`${BASE_URL}/api/ble/services/${device.mac}`);
          if (services.data.length > 0) {
            console.log("Services found on retry:", services.data);
          }
          else {
            console.warn("No services found even after retrying.");
            handleDisconnect(device.mac);
            return;
          }
        }
        
        const cleaned = services.data.map((srv: GattService) => ({
          name: srv.name,
          path: srv.path,
          uuid: srv.uuid,
          characteristics: Array.isArray(srv.characteristics)
            ? srv.characteristics.filter((c) => c && c.uuid && Array.isArray(c.properties))
            : [],
        }));
        setGattMap({ ...gattMap, [device.mac]: cleaned });
      }
    } catch {
      setConnectionStatus({ ...connectionStatus, [device.mac]: "Failed" });
    }
  };

  const handleDisconnect = async (mac: string) => {
    try {
      await axios.post(`${BASE_URL}/api/ble/disconnect`, { mac }, {
        headers: { "Content-Type": "application/json" },
      });

      setConnectedDevices(connectedDevices.filter((d) => d.mac !== mac));
      const { [mac]: _, ...rest } = gattMap;
      setGattMap(rest);
      setSelectedChars([]);
      setConnectionStatus({ ...connectionStatus, [mac]: "🔌 Disconnected" });
      console.log("Disconnected from:", mac);
    } catch (error) {
      console.error("Disconnection failed:", error);
      setConnectionStatus({ ...connectionStatus, [mac]: "❌ Disconnection failed" });
    }
  };

  const handleNotifyToggle = async (mac: string, 
                                    path: string,
                                    uuid: string,
                                    charName: string) => {
    const id = `${mac}-${path}-${uuid}`;
    console.log("Toggling notify for:", id);
    const next = !notifications[id];

    try {
      const res = await axios.post(`${BASE_URL}/api/ble/notify`, {
        mac,
        path,
        uuid,
        enable: next,
      });
         // Parse the backend response
      let message = "";
      let status = "";
      let numValues = 0;
      if (Array.isArray(res.data) && res.data[0]?.stringValue) {
        const parsed = JSON.parse(res.data[0].stringValue);
        message = parsed.message?.toLowerCase();
        status = parsed.status;
        numValues = parsed.number_of_values || 0;
      }
       // Save characteristic name and number of values
      setCharValues({
        ...charValues,
        [id]: { name: charName, numberOfValues: numValues },
      });
      console.log("check charValues:", charValues);

      // Update notifications state based on parsed message
      if (status === "success" && message.includes("enabled")) {
        setNotifications({ ...notifications, [id]: true });
      } else if (status === "success" && message.includes("disabled")) {
        setNotifications({ ...notifications, [id]: false });
      }

      console.log("/api/ble/notify API response:", res.data);

      if (status === "success" && message.includes("enabled")) {
        setSelectedChars(
          selectedChars.includes(id)
            ? selectedChars
            : [...selectedChars, id]
        );
        console.log("Notifications enabled for:", id);
        const interval = setInterval(() => {
          setNotifValues({
            ...notifValues,
            [id]: "🟢 Value at " + new Date().toLocaleTimeString(),
          });
        }, 1000);
        } else if (status === "success" && message.includes("disabled")) {
        setNotifValues({
          ...notifValues,
          [id]: "",
        });
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
     setWriteValues({ ...writeValues, [`${mac}-${uuid}`]: value });
  };

  const toggleSelectChar = (cid: string) => {
    setSelectedChars(
      selectedChars.includes(cid)
        ? selectedChars.filter((id) => id !== cid)
        : [...selectedChars, cid]
    );
  };

  const enableSelectedNotify = async () => {
    for (const cid of selectedChars) {
      const [mac, path, uuid] = cid.split("-");
      await handleNotifyToggle(mac, path, uuid, charValues[cid]?.name || uuid);
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
            <Button variant="secondary" onClick={() => setShowScanned(!showScanned)}>
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
            <Button variant="secondary" onClick={() => setShowConnected(!showConnected)}>
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
                  {expandedDevices[dev.mac] ? "Hide GATT" : "Show GATT"}
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDisconnect(dev.mac)}>
                  🔌 Disconnect
                </Button>
              </div>
            </div>

            {expandedDevices[dev.mac] && Array.isArray(gattMap[dev.mac]) && (
              
              <div className="space-y-4">
                {gattMap[dev.mac].map((srv) => (
                  <div key={srv.uuid} className="border p-3 rounded">
                    <p className="font-semibold">
                      🔹 {srv.name?.trim() ? srv.name : getLabel(srv.uuid)}
                    </p>
                    <p className="text-sm text-muted-foreground">UUID: {srv.uuid}</p>

                    {srv.characteristics.map((char) => {
                      const cid = `${dev.mac}-${char.path}-${char.uuid}`;
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
                              {char.name ? `${dev.mac}-${char.path}-${char.uuid}` : char.uuid}
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
                                variant={notifications[cid] ?  "secondary":"primary"}
                                onClick={() => handleNotifyToggle(dev.mac,char.path, char.uuid,char.name)}
                              >
                                {notifications[cid] ? "Disable Notify" : "Enable Notify"}
                              </Button>
                            )}
                          </div>

                          {notifValues[cid] && (
                            <div className="text-sm text-green-600 pt-2">
                              🔔 {notifValues[cid]}
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