import React from "react";

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number;
  onValueChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({ 
  value, 
  onValueChange, 
  ...props 
}) => (
  <div className="flex flex-col gap-1">
    <input
      type="range"
      value={value}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className="w-full"
      {...props}
    />
  </div>
);