"use client";

import { AlertTriangle } from "lucide-react";
import { useTolva } from "@/lib/image/store";
import type { Degradation } from "@/lib/capabilities";

/** Referencia estable para el caso «aún no hay capacidades detectadas».
 *  Un `[]` literal dentro del selector devuelve un array nuevo en cada llamada y
 *  React lo detecta como estado cambiante en cada render
 *  («getServerSnapshot should be cached to avoid an infinite loop»). */
const NO_DEGRADATIONS: readonly Degradation[] = [];

/**
 * Aviso de degradación: cuando el navegador no expone alguna capacidad (sin
 * WebCodecs, sin OffscreenCanvas, …), se muestra el mensaje concreto y la ruta
 * alternativa, nunca un error críptico (§8.3).
 */
export function DegradationBanner() {
  const degradations = useTolva((s) => s.capabilities?.degradations ?? NO_DEGRADATIONS);

  if (degradations.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Limitaciones de este navegador"
      className="rounded-panel border border-warning/40 bg-chrome p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="flex flex-col gap-1">
          <p className="text-subheading text-text">Este navegador tiene limitaciones</p>
          <ul className="flex flex-col gap-1">
            {degradations.map((degradation) => (
              <li key={degradation.feature} className="text-small text-text-secondary">
                {degradation.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
