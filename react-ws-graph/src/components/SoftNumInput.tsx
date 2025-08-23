// src/components/SoftNumberInput.tsx
import React from "react";

type Props = {
  value: number | undefined;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  withSteppers?: boolean;
};

function clamp(n: number, min?: number, max?: number) {
  if (typeof min === "number") n = Math.max(min, n);
  if (typeof max === "number") n = Math.min(max, n);
  return n;
}

export default function SoftNumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  className = "w-20 text-sm",
  withSteppers = false,
}: Props) {
  const [text, setText] = React.useState<string>(
    value ?? value === 0 ? String(value) : ""
  );

  React.useEffect(() => {
    const s = value ?? value === 0 ? String(value) : "";
    setText(s);
  }, [value]);

  const commit = React.useCallback(() => {
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) {
      const fallback = typeof min === "number" ? min : 0;
      onChange(fallback);
      setText(String(fallback));
      return;
    }
    const finalVal = clamp(parsed, min, max);
    onChange(finalVal);
    setText(String(finalVal));
  }, [text, min, max, onChange]);

  const inc = () => {
    const base = Number(text);
    const parsed = Number.isFinite(base) ? base : (typeof min === "number" ? min : 0);
    const next = clamp(parsed + step, min, max);
    onChange(next);
    setText(String(next));
  };

  const dec = () => {
    const base = Number(text);
    const parsed = Number.isFinite(base) ? base : (typeof min === "number" ? min : 0);
    const next = clamp(parsed - step, min, max);
    onChange(next);
    setText(String(next));
  };

  return (
    <div className="relative inline-block">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className={[
          // base input styling
          "border rounded-md px-2 py-1 text-sm outline-none",
          // use shadcn-style tokens so themes apply
          "bg-background text-foreground border-input focus:ring focus:ring-ring/50",
          // make room for steppers (doesn't change height)
          withSteppers ? "pr-8" : "",
          className,
        ].join(" ")}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (withSteppers) {
            if (e.key === "ArrowUp") { e.preventDefault(); inc(); }
            if (e.key === "ArrowDown") { e.preventDefault(); dec(); }
          }
        }}
      />

      {withSteppers && (
        <div
          // center the tiny stack vertically; don't affect layout
          className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-[2px] pointer-events-none"
          aria-hidden="true"
        >
          <button
            type="button"
            onClick={inc}
            tabIndex={-1}
            // very small, theme-aware, and clickable
            className={[
              "pointer-events-auto h-2 w-2 rounded-sm border text-[10px] leading-none",
              "flex items-center justify-center select-none",
              "bg-background text-muted-foreground border-border",
              "hover:bg-accent hover:text-accent-foreground active:scale-95 transition",
              "focus:outline-none",
            ].join(" ")}
            aria-label="Increment"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={dec}
            tabIndex={-1}
            className={[
              "pointer-events-auto h-2 w-2 rounded-sm border text-[10px] leading-none",
              "flex items-center justify-center select-none",
              "bg-background text-muted-foreground border-border",
              "hover:bg-accent hover:text-accent-foreground active:scale-95 transition",
              "focus:outline-none",
            ].join(" ")}
            aria-label="Decrement"
          >
            ▼
          </button>
        </div>
      )}
    </div>
  );
}
