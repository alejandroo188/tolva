import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium select-none " +
  "transition-opacity disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  // Casi negro en claro, casi blanco en oscuro: el acento se reserva (ADR-0015).
  primary: "bg-text text-surface hover:opacity-90",
  secondary: "bg-chrome text-text border border-line-strong hover:bg-surface-2",
  ghost: "text-text-secondary hover:bg-accent-subtle hover:text-text",
  danger: "text-danger border border-danger/40 hover:bg-danger/10",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-small rounded-control",
  md: "h-10 px-4 text-body rounded-field",
  lg: "h-12 px-5 text-subheading rounded-field",
};

export type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
