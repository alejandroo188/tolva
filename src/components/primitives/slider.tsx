"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type SliderProps = Omit<ComponentProps<"input">, "type"> & {
  "aria-label": string;
};

/**
 * Rango nativo (`<input type="range">`) con la pista y el pulgar dibujados en
 * `globals.css` usando sólo tokens. Accesible y navegable por teclado sin JS.
 */
export function Slider({ className, "aria-label": ariaLabel, ...props }: SliderProps) {
  return (
    <input
      type="range"
      aria-label={ariaLabel}
      className={cn("slider w-full cursor-pointer", className)}
      {...props}
    />
  );
}
