import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "danger";

const tones: Record<Tone, string> = {
  info: "border-line-strong",
  success: "border-success/50",
  danger: "border-danger/50",
};

export type ToastProps = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

/**
 * Aviso transitorio. `role="status"` para info/éxito y `role="alert"` para
 * error (anunciado de inmediato). La cola y el auto-cierre llegan en el Hito 4.
 */
export function Toast({ children, tone = "info", className }: ToastProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-field border bg-chrome px-4 py-3 text-small text-text shadow-float",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
