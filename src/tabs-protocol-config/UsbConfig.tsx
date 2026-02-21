import React from "react";
import { PlugZap } from "lucide-react";

export const USBConfig: React.FC = () => {
  return (
    <div className="space-y-6 text-center mt-16 text-muted-foreground">
      <PlugZap className="mx-auto w-10 h-10 mb-2 text-blue-500" />
      <h2 className="text-xl font-semibold">USB Configuration</h2>
      <p className="text-sm">USB device controls will be available soon...</p>
    </div>
  );
};
