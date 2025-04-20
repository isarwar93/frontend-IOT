import React from "react";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-12 h-8 p-0 border-none cursor-pointer bg-transparent"
    />
  </div>
);
