import React from "react";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onCheckedChange, label }) => (
  <div className="flex items-center gap-2">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`w-12 h-6 rounded-full p-1 transition ${
        checked ? "bg-green-500" : "bg-gray-300"
      }`}
      onClick={() => onCheckedChange(!checked)}
    >
      <div
        className={`h-4 w-4 bg-white rounded-full transition-transform ${
          checked ? "translate-x-6" : ""
        }`}
      />
    </button>
  </div>
);
