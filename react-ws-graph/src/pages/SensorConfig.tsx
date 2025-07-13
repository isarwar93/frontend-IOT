import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUIStore } from "@/store/useUIStore";

export const SensorConfigPage: React.FC = () => {
  const sensors = useUIStore((s) => s.sensors);
  const addSensor = useUIStore((s) => s.addSensor);
  const updateSensorAssignment = useUIStore((s) => s.updateSensorAssignment);
  const [showSimulatedSensors, setShowSimulatedSensors] = useState(false);

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

  return (
    <div className="p-6 space-y-10 bg-white text-black dark:bg-zinc-900 dark:text-white min-h-screen">
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
    </div>
  );
};

export default SensorConfigPage;
