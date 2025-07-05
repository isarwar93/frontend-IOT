import React, { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUIStore } from "@/store/useUIStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface BLEDevice {
  name: string;
  mac: string;
  rssi: number;
}

interface GattService {
  uuid: string;
  characteristics: { uuid: string; properties: string[] }[];
}

export const SensorConfigPage: React.FC = () => {
  const sensors = useUIStore((s) => s.sensors);
  const addSensor = useUIStore((s) => s.addSensor);
  const updateSensorAssignment = useUIStore((s) => s.updateSensorAssignment);

  const [showSimulatedSensors, setShowSimulatedSensors] = useState(false);
  const [bleDevices, setBleDevices] = useState<BLEDevice[]>([]);
  const [connectedMac, setConnectedMac] = useState<string | null>(null);
  const [gattData, setGattData] = useState<GattService[] | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{ [mac: string]: string }>({});
  const [isScanning, setIsScanning] = useState(false);

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
      console.log("BLE Scan Result:", data);

      if (Array.isArray(data)) {
        setBleDevices(data.filter((d: BLEDevice) => d.rssi !== -999));
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

  const handleConnect = async (mac: string) => {
    setConnectionStatus((prev) => ({ ...prev, [mac]: "⏳ Connecting..." }));
    try {
      const response = await axios.post(`${BASE_URL}/api/ble/connect`,  mac ,{
          headers: { "Content-Type": "Content-Type: application/json" },
        });
      const result = response.data;

      if (result.success) {
        setConnectedMac(mac);
        setConnectionStatus((prev) => ({ ...prev, [mac]: "✅ Connected" }));

        const servicesResponse = await axios.get(`${BASE_URL}/api/ble/services?mac=${mac}`);
        const servicesData = servicesResponse.data;
        setGattData(servicesData.services || []);
      } else {
        setConnectionStatus((prev) => ({ ...prev, [mac]: "❌ Connection failed" }));
      }
    } catch (err) {
      console.error("BLE connection error:", err);
      setConnectionStatus((prev) => ({ ...prev, [mac]: "❌ Error during connection" }));
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

      {showSimulatedSensors && (
        sensors.length === 0 ? (
          <p className="text-muted-foreground">No sensors discovered yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sensors.map((sensor) => (
              <div
                key={sensor.id}
                className="border p-4 rounded-md bg-muted dark:bg-zinc-800 space-y-2"
              >
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
        )
      )}

      {/* BLE Section */}
      <div className="pt-10 border-t border-gray-300 dark:border-zinc-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Bluetooth Sensor Configuration</h2>
          <Button onClick={handleScan} disabled={isScanning}>
            {isScanning ? "🔄 Scanning..." : "🔍 Scan BLE Devices"}
          </Button>
        </div>

        {isScanning && (
          <p className="text-sm text-muted-foreground mb-2">Scanning for devices, please wait...</p>
        )}

        {bleDevices.length === 0 && !isScanning ? (
          <p className="text-muted-foreground">No BLE devices found.</p>
        ) : (
          <div className="overflow-auto">
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
                      <Button onClick={() => handleConnect(dev.mac)} size="sm">
                        {connectedMac === dev.mac ? "✅ Connected" : "Connect"}
                      </Button>
                      {connectionStatus[dev.mac] && (
                        <p className="text-xs mt-1 text-muted-foreground">
                          {connectionStatus[dev.mac]}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {gattData && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold">GATT Services & Characteristics</h3>
            {gattData.map((service) => (
              <div key={service.uuid} className="border p-4 rounded dark:border-zinc-700">
                <p className="font-medium">Service: {service.uuid}</p>
                <ul className="list-disc pl-6">
                  {service.characteristics.map((char) => (
                    <li key={char.uuid}>
                      Characteristic: {char.uuid} – {char.properties.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SensorConfigPage;
