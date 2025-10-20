import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"; // Added size prop for completeness
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  className = "",
  children,
  size = "md",
  ...props
}) => {
  const base = "px-2 py-1 rounded font-medium transition";
  const sizeClasses = {
    sm: "px-1 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-black hover:bg-gray-300",
    danger: "bg-red-900 text-white hover:bg-red-20",
    outline: "border-border bg-muted hover:bg-accent",
    ghost: "text-gray-700 hover:bg-gray-100",  // old hardcoded style
  };
  

  return (
    <button 
      className={`${base} ${variants[variant]} ${sizeClasses[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};