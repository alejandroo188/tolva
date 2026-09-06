"use client";

import { X } from "lucide-react";
import { useTolva } from "@/lib/image/store";
import { cn } from "@/lib/cn";

/**
 * Selector de fuentes: fila horizontal de miniaturas con el fichero activo
 * marcado y un aspa para quitarlo. Las miniaturas usan el `objectURL` del
 * original (las decodifica el navegador, no el hilo principal de la app).
 */
export function SourceStrip() {
  const sources = useTolva((s) => s.sources);
  const selectedId = useTolva((s) => s.selectedId);
  const selectSource = useTolva((s) => s.selectSource);
  const removeSource = useTolva((s) => s.removeSource);

  if (sources.length === 0) return null;

  return (
    <ul role="listbox" aria-label="Imágenes cargadas" className="flex gap-2 overflow-x-auto pb-2">
      {sources.map((source) => {
        const selected = source.id === selectedId;
        return (
          <li key={source.id} className="relative shrink-0">
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => selectSource(source.id)}
              className={cn(
                "relative block h-16 w-16 overflow-hidden rounded-field border-2 transition-colors",
                selected ? "border-accent" : "border-line hover:border-line-strong",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del original cargado por el usuario */}
              <img
                src={source.objectUrl}
                alt={source.name}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </button>
            <button
              type="button"
              aria-label={`Quitar ${source.name}`}
              onClick={() => removeSource(source.id)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-text text-surface shadow-control"
            >
              <X aria-hidden="true" className="h-3 w-3" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
