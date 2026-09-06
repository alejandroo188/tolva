"use client";

import { useTolva } from "@/lib/image/store";
import { formatBytes, formatSavings, savingsPercent } from "@/lib/domain/bytes";
import { ProgressBar } from "@/components/primitives";

/**
 * Panel de peso — el elemento héroe del §7.1. La cifra (resultado frente a
 * original y el porcentaje de ahorro) es el único elemento con volumen visual
 * de la interfaz. Se alimenta del último trabajo terminado de la fuente activa,
 * no de la vista previa.
 */
export function WeightPanel() {
  const selectedId = useTolva((s) => s.selectedId);
  const source = useTolva((s) => s.sources.find((src) => src.id === s.selectedId));
  const job = useTolva((s) => {
    if (!s.selectedId) return undefined;
    const done = s.jobs.filter(
      (j) => j.sourceId === s.selectedId && j.status === "done" && j.result,
    );
    return done[done.length - 1];
  });

  if (!selectedId || !source) return null;

  const original = source.bytes;
  const result = job?.result?.bytes;

  if (!result) {
    return (
      <section
        aria-label="Peso del fichero"
        className="rounded-panel border border-line bg-surface p-5"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-display tabular-nums text-text">{formatBytes(original)}</span>
          <span className="text-small text-text-secondary">sin convertir</span>
        </div>
        <ProgressBar value={0} aria-label="Ahorro de peso" className="mt-4" />
      </section>
    );
  }

  const savings = savingsPercent(original, result);
  const barValue = Number.isFinite(savings) ? Math.max(0, Math.min(100, savings)) : 0;
  const savingsTone = Number.isFinite(savings) && savings >= 0 ? "text-success" : "text-danger";

  return (
    <section
      aria-label="Peso del fichero"
      className="rounded-panel border border-line bg-surface p-5"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-display tabular-nums text-text">{formatBytes(original)}</span>
        <span className="text-body text-accent" aria-hidden="true">
          →
        </span>
        <span className="text-display tabular-nums text-text">{formatBytes(result)}</span>
        <span className={`text-subheading font-semibold ${savingsTone}`}>
          {formatSavings(savings)}
        </span>
      </div>
      <ProgressBar value={barValue} aria-label="Ahorro de peso" className="mt-4" />
    </section>
  );
}
