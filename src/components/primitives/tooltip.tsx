"use client";

import { cloneElement, isValidElement, useId, type ReactElement } from "react";

export type TooltipProps = {
  label: string;
  children: ReactElement<Record<string, unknown>>;
};

/**
 * Tooltip por hover y foco. El disparador recibe `aria-describedby` que apunta
 * a la etiqueta (`role="tooltip"`); se muestra con `group-focus-within` para
 * que también aparezca en el recorrido por teclado.
 */
export function Tooltip({ label, children }: TooltipProps) {
  const id = useId();
  const trigger = isValidElement(children)
    ? cloneElement(children, { "aria-describedby": id })
    : children;

  return (
    <span className="group relative inline-flex">
      {trigger}
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-control bg-text px-2 py-1 text-caption text-surface opacity-0 shadow-float transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
