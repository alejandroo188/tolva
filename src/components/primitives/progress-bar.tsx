import { cn } from "@/lib/cn";

export type ProgressBarProps = {
  /** 0–100; se satura fuera de rango. */
  value: number;
  "aria-label"?: string;
  className?: string;
};

export function ProgressBar({ value, "aria-label": ariaLabel, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${clamped}%` }} />
    </div>
  );
}
