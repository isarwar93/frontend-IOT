import React from "react";
import { useUIStore } from "../store/useUIStore";
import { Bluetooth, Wifi, Usb } from "lucide-react";
import { BLEConfig } from "../tabs-protocol-config/BleConfig";
import { MQTTConfig } from "../tabs-protocol-config/MqttConfig";
import { USBConfig } from "../tabs-protocol-config/UsbConfig";

const protocolTabs = [
  { key: "ble", label: "BLE", icon: Bluetooth },
  { key: "mqtt", label: "MQTT", icon: Wifi },
  { key: "usb", label: "USB", icon: Usb },
] as const;

export const ProtocolConfigPage: React.FC = () => {
  const protocolTab = useUIStore((s) => s.protocolTab);
  const setProtocolTab = useUIStore((s) => s.setProtocolTab);

  const renderTab = () => {
    switch (protocolTab) {
      case "mqtt":
        return <MQTTConfig />;
      case "usb":
        return <USBConfig />;
      default:
        return <BLEConfig />;
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="w-full px-6 pt-6">
        <h1 className="text-4xl font-bold mb-4">Protocol Configuration</h1>

        <div className="border-b border-border w-full">
          <div className="flex w-full">
            {protocolTabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setProtocolTab(key)}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 capitalize rounded-t-md
                  transition-colors duration-200
                  ${
                    protocolTab === key
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
            <div className="flex-1 border-b border-border" />
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 w-full">{renderTab()}</div>
    </div>
  );
};

export default ProtocolConfigPage;
