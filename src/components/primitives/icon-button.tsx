import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "ghost" | "secondary" | "primary";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center shrink-0 transition-opacity " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  ghost: "text-text-secondary hover:bg-accent-subtle hover:text-text",
  secondary: "bg-chrome text-text border border-line-strong hover:bg-surface-2",
  primary: "bg-text text-surface hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 w-8 rounded-control",
  md: "h-10 w-10 rounded-field",
  lg: "h-12 w-12 rounded-field",
};

export type IconButtonProps = ComponentProps<"button"> & {
  /** Etiqueta accesible: el icono no lleva texto visible. */
  "aria-label": string;
  icon: ReactNode;
  variant?: Variant;
  size?: Size;
};

export function IconButton({
  icon,
  variant = "ghost",
  size = "md",
  className,
  type,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {icon}
    </button>
  );
}
