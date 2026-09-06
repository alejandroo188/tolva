"use client";

import { Check, Download, Package, RotateCcw, X } from "lucide-react";
import { useTolva, downloadBlob, downloadJobsAsZip } from "@/lib/image/store";
import type { PipelinePhase } from "@/lib/workers/types";
import { Button, ProgressBar } from "@/components/primitives";

/** Etiqueta legible de cada fase del procesado. */
const PHASE_LABELS: Record<PipelinePhase, string> = {
  decode: "Descodificando",
  crop: "Recortando",
  rotate: "Rotando",
  straighten: "Enderezando",
  flip: "Volteando",
  resize: "Redimensionando",
  adjust: "Ajustando color",
  watermark: "Marcando",
  encode: "Codificando",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En espera",
  running: "Procesando",
  done: "Listo",
  error: "Error",
  canceled: "Cancelado",
};

function phaseLabel(phase: PipelinePhase | ""): string | null {
  return phase ? (PHASE_LABELS[phase] ?? phase) : null;
}

/**
 * Cola de trabajos: progreso real, cancelación, reintento y descarga. El lote
 * descarga como ZIP (nombres sin colisión) o fichero a fichero. El progreso se
 * anuncia con `aria-live="polite"` (no por cada frame, sólo el % entero).
 */
export function Queue() {
  const jobs = useTolva((s) => s.jobs);
  const sources = useTolva((s) => s.sources);
  const selectedId = useTolva((s) => s.selectedId);
  const convertSelected = useTolva((s) => s.convertSelected);
  const convertAll = useTolva((s) => s.convertAll);
  const applyToAll = useTolva((s) => s.applyToAll);
  const cancelJob = useTolva((s) => s.cancelJob);
  const cancelAll = useTolva((s) => s.cancelAll);
  const retryJob = useTolva((s) => s.retryJob);
  const clearJobs = useTolva((s) => s.clearJobs);

  const doneCount = jobs.filter((j) => j.status === "done").length;
  const activeCount = jobs.filter((j) => j.status === "pending" || j.status === "running").length;

  if (sources.length === 0 && jobs.length === 0) return null;

  return (
    <section
      aria-label="Cola de conversión"
      className="rounded-panel border border-line bg-surface p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-heading text-text">Conversión</h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={applyToAll} disabled={!selectedId}>
            Aplicar a todos
          </Button>
          <Button size="sm" onClick={convertSelected} disabled={!selectedId}>
            Convertir
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={convertAll}
            disabled={sources.length === 0}
          >
            Convertir todo
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => downloadJobsAsZip(jobs)}
            disabled={doneCount === 0}
          >
            <Package aria-hidden="true" className="h-4 w-4" />
            Descargar ZIP
          </Button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <p className="mt-4 text-small text-text-secondary">
          Convierte para ver los resultados aquí.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {jobs.map((job) => {
            const percent = Math.round(job.progress * 100);
            const phase = phaseLabel(job.phase);
            const label =
              job.status === "running"
                ? `${STATUS_LABELS.running}: ${percent} %`
                : STATUS_LABELS[job.status];
            return (
              <li key={job.id} className="rounded-field border border-line bg-chrome p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-small font-medium text-text">{job.name}</span>
                  <span className="shrink-0 text-caption text-text-secondary">{label}</span>
                </div>

                {job.status === "running" || job.status === "pending" ? (
                  <>
                    <ProgressBar
                      value={percent}
                      aria-label={`Progreso de ${job.name}`}
                      className="mt-2"
                    />
                    <p aria-live="polite" className="sr-only">
                      {job.name}: {percent} %{phase ? `, ${phase}` : ""}
                    </p>
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => cancelJob(job.id)}>
                        <X aria-hidden="true" className="h-4 w-4" />
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : null}

                {job.status === "done" && job.result ? (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-caption text-success">
                      {job.result.width}×{job.result.height}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        downloadBlob(
                          new Blob([job.result!.data], { type: job.result!.mime }),
                          job.name,
                        )
                      }
                    >
                      <Download aria-hidden="true" className="h-4 w-4" />
                      Descargar
                    </Button>
                  </div>
                ) : null}

                {job.status === "error" ? (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-small text-danger">
                      {job.error ?? "Error desconocido"}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => retryJob(job.id)}>
                      <RotateCcw aria-hidden="true" className="h-4 w-4" />
                      Reintentar
                    </Button>
                  </div>
                ) : null}

                {job.status === "done" ? (
                  <span className="sr-only">
                    <Check aria-hidden="true" /> {job.name} completado
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {jobs.length > 0 ? (
        <div className="mt-4 flex justify-end gap-2">
          {activeCount > 0 ? (
            <Button size="sm" variant="ghost" onClick={cancelAll}>
              Cancelar todo
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={clearJobs}>
            Limpiar cola
          </Button>
        </div>
      ) : null}
    </section>
  );
}
