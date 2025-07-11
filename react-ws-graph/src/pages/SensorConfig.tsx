import React, { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUIStore } from "@/store/useUIStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface BLEDevice {
  mac: string;
  name: string;
  rssi: number;
}

type GattCharacteristic = {
  uuid: string;
  properties: string[];
};

type GattService = {
  uuid: string;
  characteristics: GattCharacteristic[];
};

export const SensorConfigPage: React.FC = () => {
  const sensors = useUIStore((s) => s.sensors);
  const addSensor = useUIStore((s) => s.addSensor);
  const updateSensorAssignment = useUIStore((s) => s.updateSensorAssignment);

  const [showSimulatedSensors, setShowSimulatedSensors] = useState(false);
  const [bleDevices, setBleDevices] = useState<BLEDevice[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<BLEDevice[]>([]);
  const [gattData, setGattData] = useState<GattService[]>([]);
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{ [mac: string]: string }>({});
  const [isScanning, setIsScanning] = useState(false);
  const [showScanned, setShowScanned] = useState(true);

  const toggleSimulatedSensors = () => {
    if (!showSimulatedSensors && sensors.length === 0) {
      const mockSensors = [
        { id: "temp1", name: "Temperature Sensor", type: "temperature", unit: "°C" },
        { id: "press1", name: "Pressure Sensor", type: "pressure", unit: "Pa" },
        { id: "accel1", name: "Accelerometer", type: "acceleration", unit: "m/s²" },
      ];
      mockSensors.forEach((sensor) => addSensor(sensor));
    }
    setShowSimulatedSensors(!showSimulatedSensors);
  };

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/ble/scan`);
      const data = response.data;

      if (Array.isArray(data)) {
        const filtered = data.filter(
          (d: BLEDevice) => d.rssi !== -999 && !connectedDevices.some((cd) => cd.mac === d.mac)
        );
        setBleDevices(filtered);
        setShowScanned(true);
      } else {
        setBleDevices([]);
        console.warn("Unexpected BLE scan response:", data);
      }
    } catch (err) {
      console.error("BLE scan error:", err);
      setBleDevices([]);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (device: BLEDevice) => {
    const { mac } = device;

    setConnectionStatus((prev) => ({ ...prev, [mac]: "⏳ Connecting..." }));
    try {
      const response = await axios.post(`${BASE_URL}/api/ble/connect`, device, {
        headers: { "Content-Type": "application/json" },
      });
      console.log("device name:",device);
      if (response.data) {
        setConnectedDevices((prev) => {
          const exists = prev.some((d) => d.mac === device.mac);
          return exists ? prev : [...prev, device];
        });
        setConnectionStatus((prev) => ({ ...prev, [mac]: "✅ Connected" }));

        const servicesResponse = await axios.get(`${BASE_URL}/api/ble/services`);
        const servicesData = servicesResponse.data;

        const cleanedData = servicesData.map((service: GattService) => ({
          ...service,
          characteristics: service.characteristics?.filter((c) => !!c.uuid) || [],
        }));

        setGattData(cleanedData);
      } else {
        setConnectionStatus((prev) => ({ ...prev, [mac]: "❌ Connection failed" }));
      }
    } catch (err) {
      console.error("BLE connection error:", err);
      setConnectionStatus((prev) => ({ ...prev, [mac]: "❌ Error during connection" }));
    }
  };

  const handleDisconnect = (mac: string) => {
    setConnectedDevices((prev) => prev.filter((d) => d.mac !== mac));
    setGattData([]);
    setSelectedChars([]);
    console.log("Disconnected", mac);
  };

  const handleCharacteristicToggle = (uuid: string) => {
    setSelectedChars((prev) =>
      prev.includes(uuid) ? prev.filter((id) => id !== uuid) : [...prev, uuid]
    );
  };

  const enableSelectedCharacteristics = async () => {
    try {
      await axios.post(`${BASE_URL}/api/ble/enable`, {
        macs: connectedDevices.map((d) => d.mac),
        characteristics: selectedChars,
      });
      console.log("Enabled:", selectedChars);
      setSelectedChars([]);
      setGattData([]);
    } catch (err) {
      console.error("Enable failed", err);
    }
  };

  return (
    <div className="p-6 space-y-10 bg-white text-black dark:bg-zinc-900 dark:text-white min-h-screen">
      {/* Simulated Sensors */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sensor Configuration</h1>
        <Button onClick={toggleSimulatedSensors}>
          {showSimulatedSensors ? "❌ Hide Sensors" : "🔍 Discover Sensors"}
        </Button>
      </div>

      {showSimulatedSensors && sensors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sensors.map((sensor) => (
            <div key={sensor.id} className="border p-4 rounded-md bg-muted dark:bg-zinc-800 space-y-2">
              <div>
                <strong>{sensor.name}</strong> ({sensor.type}) - {sensor.unit}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm">Graph Window:</label>
                <Input
                  type="number"
                  min={0}
                  value={sensor.graphWindow ?? 0}
                  onChange={(e) =>
                    updateSensorAssignment(sensor.id, { graphWindow: Number(e.target.value) })
                  }
                  className="w-20"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm">Waveform Index:</label>
                <Input
                  type="number"
                  min={0}
                  value={sensor.waveformIndex ?? 0}
                  onChange={(e) =>
                    updateSensorAssignment(sensor.id, { waveformIndex: Number(e.target.value) })
                  }
                  className="w-20"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BLE Section */}
      <div className="pt-10 border-t border-gray-300 dark:border-zinc-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Bluetooth Sensor Configuration</h2>
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

        {showScanned && bleDevices.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">📡 Scanned Devices</h3>
            <table className="min-w-full border border-gray-300 dark:border-zinc-700 rounded-md">
              <thead className="bg-gray-100 dark:bg-zinc-800">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">MAC</th>
                  <th className="text-left px-4 py-2">RSSI</th>
                  <th className="text-left px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {bleDevices.map((dev) => (
                  <tr key={dev.mac} className="border-t border-gray-200 dark:border-zinc-700">
                    <td className="px-4 py-2">{dev.name || "Unnamed"}</td>
                    <td className="px-4 py-2">{dev.mac}</td>
                    <td className="px-4 py-2">{dev.rssi}</td>
                    <td className="px-4 py-2">
                      {connectedDevices.some((d) => d.mac === dev.mac) ? (
                        <span className="text-green-600 dark:text-green-400 font-medium text-sm">
                          ✅ Connected
                        </span>
                      ) : (
                        <Button onClick={() => handleConnect(dev)} size="sm">
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

        {connectedDevices.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold mb-2">✅ Connected Devices</h3>
            <table className="min-w-full border border-gray-300 dark:border-zinc-700 rounded-md mb-4">
              <thead className="bg-gray-100 dark:bg-zinc-800">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">MAC</th>
                  <th className="text-left px-4 py-2">RSSI</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {connectedDevices.map((dev) => (
                  <tr key={dev.mac} className="border-t border-gray-200 dark:border-zinc-700">
                    <td className="px-4 py-2">{dev.name || "Unnamed"}</td>
                    <td className="px-4 py-2">{dev.mac}</td>
                    <td className="px-4 py-2">{dev.rssi}</td>
                    <td className="px-4 py-2">{connectionStatus[dev.mac]}</td>
                    <td className="px-4 py-2">
                      <Button variant="danger" size="sm" onClick={() => handleDisconnect(dev.mac)}>
                        🔌 Disconnect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* GATT */}
        {connectedDevices.length > 0 && gattData.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold">🔬 GATT Services & Characteristics</h3>
            {gattData.map((service) => (
              <div key={service.uuid} className="border p-4 rounded dark:border-zinc-700">
                <p className="font-medium">Service: {service.uuid}</p>
                <ul className="pl-6 space-y-2">
                  {Array.isArray(service.characteristics) && service.characteristics.length > 0 ? (
                    service.characteristics.map((char) => (
                      <li key={char.uuid} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedChars.includes(char.uuid)}
                          onChange={() => handleCharacteristicToggle(char.uuid)}
                        />
                        <span>
                          {char.uuid} –{" "}
                          {Array.isArray(char.properties)
                            ? char.properties.join(", ")
                            : "Unknown"}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No characteristics available</li>
                  )}
                </ul>
              </div>
            ))}
            {selectedChars.length > 0 && (
              <Button className="mt-4" onClick={enableSelectedCharacteristics}>
                ✅ Enable Selected Characteristics
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SensorConfigPage;
