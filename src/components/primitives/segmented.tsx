"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export type SegmentedOption<T extends string> = { value: T; label: string };

const sizes = {
  sm: "h-8 px-3 text-small",
  md: "h-10 px-4 text-body",
} as const;

export type SegmentedProps<T extends string> = {
  options: Array<SegmentedOption<T>>;
  value: T;
  onValueChange: (value: T) => void;
  "aria-label": string;
  size?: keyof typeof sizes;
  className?: string;
};

/**
 * Control segmentado. Semántica `radiogroup` con navegación por flechas,
 * `Home`/`End` y tabulación roving (el foco sólo visita la opción activa).
 */
export function Segmented<T extends string>({
  options,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  size = "md",
  className,
}: SegmentedProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % options.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + options.length) % options.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = options.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    onValueChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-field border border-line bg-chrome p-1",
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            ref={(el) => {
              refs.current[index] = el;
            }}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              sizes[size],
              "rounded-control font-medium transition-colors",
              selected
                ? "bg-surface text-text shadow-control"
                : "text-text-secondary hover:text-text",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
