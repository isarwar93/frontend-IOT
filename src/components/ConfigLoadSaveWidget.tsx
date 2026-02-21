import React, { useRef } from "react";
import { useUIStore } from "../store/useUIStore";
import {
  FileInput,   Save
} from "lucide-react";

import { Button } from "@/components/ui/Button";

export function ConfigLoadSaveWidget() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        useUIStore.getState().loadConfig(json);
        console.log("✅ Config loaded successfully:", json);
      } catch (error) {
        console.error("❌ Invalid config file:", error);
      }
    };
    reader.readAsText(file);
  }

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

     //  SAVE CONFIG HANDLER
   const handleSaveConfig = () => {
    const state = useUIStore.getState();
    const configBlob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(configBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ui-config.json";
    a.click();
  };

  return (
     <div className="flex items-center gap-2">
        <Button className="flex items-center gap-2"
            onClick={handleSaveConfig} variant="outline">
              <Save className="w-5 h-5"/> Save Config
        </Button>
      <button
        onClick={handleButtonClick}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-base text-white rounded hover:bg-blue-700 transition"
      >
        <FileInput className="w-5 h-5" />
        <span>Load Config</span>
      </button>

      {/* hidden input field */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
