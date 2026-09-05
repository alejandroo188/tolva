"use client";

import { cn } from "@/lib/cn";

const sizes = {
  sm: { track: "h-5 w-9", thumb: "h-4 w-4", on: "translate-x-4", off: "translate-x-0.5" },
  md: { track: "h-6 w-11", thumb: "h-5 w-5", on: "translate-x-5", off: "translate-x-0.5" },
} as const;

export type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label": string;
  disabled?: boolean;
  size?: keyof typeof sizes;
  className?: string;
};

export function Switch({
  checked,
  onCheckedChange,
  "aria-label": ariaLabel,
  disabled = false,
  size = "md",
  className,
}: SwitchProps) {
  const s = sizes[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        s.track,
        "relative inline-flex shrink-0 items-center rounded-full transition-colors",
        "disabled:opacity-50 disabled:pointer-events-none",
        checked ? "bg-accent" : "bg-line-strong",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          s.thumb,
          "block rounded-full bg-surface shadow-control transition-transform",
          checked ? s.on : s.off,
        )}
      />
    </button>
  );
}
