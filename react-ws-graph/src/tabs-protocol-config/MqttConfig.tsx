import React from "react";
import { AlertCircle } from "lucide-react";

export const MQTTConfig: React.FC = () => {
  return (
    <div className="space-y-6 text-center mt-16 text-muted-foreground">
      <AlertCircle className="mx-auto w-10 h-10 mb-2 text-yellow-500" />
      <h2 className="text-xl font-semibold">MQTT Configuration</h2>
      <p className="text-sm">Features for MQTT protocol configuration are coming soon...</p>
    </div>
  );
};
