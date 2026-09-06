/**
 * Estado de la aplicación de imagen (Zustand): fuentes, editor, cola, vista
 * previa y preferencias.
 *
 * El procesado real vive en el worker (`ImagePipeline`); aquí sólo se orquesta:
 * se construyen recetas, se envían trabajos y se recoge el resultado. Ningún
 * píxel se decodifica ni codifica en el hilo principal (§4.2).
 */

import { create } from "zustand";
import { ImagePipeline } from "@/lib/media/image-pipeline";
import { detectCapabilities, type Capabilities } from "@/lib/capabilities";
import { changeExtension, sanitizeFilename, uniqueName } from "@/lib/domain/filenames";
import type { OutputFormat, OutputSpec } from "@/lib/domain/types";
import type { PipelinePhase } from "@/lib/workers/types";
import { intakeFile, type IntakeFailure, type SourceItem } from "./intake";
import {
  buildRecipe,
  emptyDraft,
  makePreviewRecipe,
  objectUrlFromResult,
  type EditorDraft,
} from "./preview";
import { loadPreferences, savePreferences, type Preferences } from "./preferences";
import { buildZip, type ZipEntry } from "./zip";

// ────────────────────────────────────────────────────────────────────────────
// Pipeline (perezoso: no arranca workers hasta el primer uso)
// ────────────────────────────────────────────────────────────────────────────

let pipeline: ImagePipeline | null = null;

function getPipeline(): ImagePipeline {
  if (!pipeline) pipeline = new ImagePipeline();
  return pipeline;
}

// ────────────────────────────────────────────────────────────────────────────
// Tipos de la cola
// ────────────────────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "running" | "done" | "error" | "canceled";

export interface JobResult {
  /** Bytes codificados (para el ZIP en lote). */
  data: ArrayBuffer;
  url: string;
  bytes: number;
  width: number;
  height: number;
  mime: string;
}

export interface JobItem {
  id: string;
  sourceId: string;
  /** Nombre de salida (extensión ya cambiada). */
  name: string;
  format: OutputFormat;
  status: JobStatus;
  /** Progreso 0–1. */
  progress: number;
  phase: PipelinePhase | "";
  error?: string;
  result?: JobResult;
}

export interface PreviewEntry {
  url: string;
  width: number;
  height: number;
}

interface TolvaState {
  sources: SourceItem[];
  selectedId: string | null;
  drafts: Record<string, EditorDraft>;
  previews: Record<string, PreviewEntry>;
  jobs: JobItem[];
  prefs: Preferences;
  capabilities: Capabilities | null;
  shortcutsOpen: boolean;

  addFiles: (files: File[]) => Promise<IntakeFailure[]>;
  removeSource: (id: string) => void;
  selectSource: (id: string) => void;
  updateDraft: (id: string, patch: Partial<EditorDraft>) => void;
  convertSelected: () => void;
  convertAll: () => void;
  cancelJob: (id: string) => void;
  cancelAll: () => void;
  retryJob: (id: string) => void;
  clearJobs: () => void;
  setPrefs: (patch: Partial<Preferences>) => void;
  /** Ajusta el formato/calidad/metadatos de salida: persiste la preferencia y lo
   *  propaga al `output` de todos los borradores. */
  setOutput: (patch: Partial<OutputSpec>) => void;
  /** Copia las operaciones del borrador seleccionado a todas las fuentes (lote). */
  applyToAll: () => void;
  setCapabilities: (capabilities: Capabilities) => void;
  setShortcutsOpen: (open: boolean) => void;
}

// Identificadores: `crypto.randomUUID` en contextos seguros (https/localhost).
function makeId(): string {
  return crypto.randomUUID();
}

// Estado compartido de cancelación (lectura síncrona desde `isAborted`).
const canceledIds = new Set<string>();

// Debounce de vista previa: por fuente, un temporizador y una secuencia monotónica.
const previewTimers = new Map<string, ReturnType<typeof setTimeout>>();
const previewSeq = new Map<string, number>();

function revokeUrl(url: string | undefined): void {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ya revocado */
  }
}

function outputFromPrefs(prefs: Preferences): OutputSpec {
  return {
    format: prefs.outputFormat,
    quality: prefs.quality,
    stripMetadata: prefs.stripMetadata,
  };
}

/** Nombre de salida: cambia la extensión y sanitiza para cualquier sistema. */
function outputName(source: SourceItem, format: OutputFormat): string {
  return sanitizeFilename(changeExtension(source.name, format));
}

/** Corre una vista previa acotada para `id` (sólo si su secuencia sigue vigente). */
async function runPreview(source: SourceItem, draft: EditorDraft): Promise<void> {
  const id = source.id;
  const seq = (previewSeq.get(id) ?? 0) + 1;
  previewSeq.set(id, seq);
  try {
    const recipe = makePreviewRecipe(buildRecipe(source, draft));
    const result = await getPipeline().convert(recipe, source.data);
    if (previewSeq.get(id) !== seq) return; // hay una vista previa más reciente
    const url = objectUrlFromResult(result);
    const previous = useTolva.getState().previews[id]?.url;
    useTolva.setState((s) => ({
      previews: { ...s.previews, [id]: { url, width: result.width, height: result.height } },
    }));
    revokeUrl(previous);
  } catch {
    // Vista previa fallida: no bloquea el editor; el trabajo real lo reintentará.
  }
}

/** Programa (con debounce) la vista previa de `id`. */
function schedulePreview(id: string): void {
  const existing = previewTimers.get(id);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    previewTimers.delete(id);
    const s = useTolva.getState();
    const source = s.sources.find((src) => src.id === id);
    const draft = s.drafts[id];
    if (source && draft) void runPreview(source, draft);
  }, 180);
  previewTimers.set(id, timer);
}

function patchJob(id: string, patch: Partial<JobItem>): void {
  useTolva.setState((s) => ({
    jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
  }));
}

/** Ejecuta un trabajo: receta → worker → resultado (o error/cancelación). */
async function runJob(jobId: string, source: SourceItem, draft: EditorDraft): Promise<void> {
  patchJob(jobId, { status: "running", phase: "decode" });
  const recipe = buildRecipe(source, draft);
  try {
    const result = await getPipeline().convert(recipe, source.data, {
      onProgress: (progress, phase) => {
        useTolva.setState((s) => ({
          jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, progress, phase } : j)),
        }));
      },
      isAborted: () => canceledIds.has(jobId),
    });
    if (canceledIds.has(jobId)) {
      patchJob(jobId, { status: "canceled", phase: "" });
      return;
    }
    patchJob(jobId, {
      status: "done",
      progress: 1,
      phase: "encode",
      result: {
        data: result.data,
        url: objectUrlFromResult(result),
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        mime: result.mime,
      },
    });
  } catch (err) {
    if (canceledIds.has(jobId)) {
      patchJob(jobId, { status: "canceled", phase: "" });
      return;
    }
    const message = err instanceof Error ? err.message : "Error desconocido";
    patchJob(jobId, { status: "error", phase: "", error: message });
  } finally {
    canceledIds.delete(jobId);
  }
}

/** Construye y lanza los trabajos de conversión de un conjunto de fuentes. */
function launchJobs(state: TolvaState, sourceIds: string[]): void {
  const sources = state.sources.filter((s) => sourceIds.includes(s.id));
  if (sources.length === 0) return;

  const newJobs: JobItem[] = sources.map((source) => {
    const draft = state.drafts[source.id] ?? emptyDraft(outputFromPrefs(state.prefs));
    return {
      id: makeId(),
      sourceId: source.id,
      name: outputName(source, draft.output.format),
      format: draft.output.format,
      status: "pending" as const,
      progress: 0,
      phase: "" as const,
    };
  });

  useTolva.setState((s) => ({ jobs: [...s.jobs, ...newJobs] }));

  for (const job of newJobs) {
    const source = state.sources.find((src) => src.id === job.sourceId);
    if (!source) continue;
    const draft = state.drafts[source.id] ?? emptyDraft(outputFromPrefs(state.prefs));
    void runJob(job.id, source, draft);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Descarga
// ────────────────────────────────────────────────────────────────────────────

/** Descarga un `Blob` bajo `name` (ancla temporal). */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Descarga los trabajos terminados como un único ZIP (sin colisiones de nombre). */
export function downloadJobsAsZip(jobs: JobItem[]): void {
  const done = jobs.filter((j) => j.status === "done" && j.result);
  if (done.length === 0) return;
  const taken = new Set<string>();
  const entries: ZipEntry[] = [];
  for (const job of done) {
    const result = job.result!;
    const name = uniqueName(job.name, taken);
    taken.add(name);
    entries.push({ name, data: new Uint8Array(result.data) });
  }
  const zip = buildZip(entries);
  const blob = new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" });
  downloadBlob(blob, "tolva.zip");
}

// ────────────────────────────────────────────────────────────────────────────
// Store
// ────────────────────────────────────────────────────────────────────────────

export const useTolva = create<TolvaState>()((set, get) => ({
  sources: [],
  selectedId: null,
  drafts: {},
  previews: {},
  jobs: [],
  prefs: loadPreferences(),
  capabilities: null,
  shortcutsOpen: false,

  addFiles: async (files) => {
    const fingerprints = new Set(get().sources.map((s) => s.fingerprint));
    const failures: IntakeFailure[] = [];
    const accepted: SourceItem[] = [];
    const hadSelection = get().selectedId != null;

    for (const file of files) {
      const result = await intakeFile(
        file,
        (bytes, mime, orientation) => getPipeline().probe(bytes, mime, orientation),
        { existing: fingerprints, makeId },
      );
      if (result.ok) {
        accepted.push(result.item);
        fingerprints.add(result.item.fingerprint);
      } else {
        failures.push(result);
      }
    }

    if (accepted.length === 0) return failures;

    set((s) => {
      const drafts = { ...s.drafts };
      for (const item of accepted) {
        if (!drafts[item.id]) drafts[item.id] = emptyDraft(outputFromPrefs(s.prefs));
      }
      return {
        sources: [...s.sources, ...accepted],
        drafts,
        selectedId: s.selectedId ?? accepted[0].id,
      };
    });

    const selected = get().selectedId ?? accepted[0].id;
    if (!hadSelection) set({ selectedId: accepted[0].id });
    schedulePreview(selected);

    return failures;
  },

  removeSource: (id) => {
    set((s) => {
      const removed = s.sources.find((src) => src.id === id);
      revokeUrl(removed?.objectUrl);
      revokeUrl(s.previews[id]?.url);
      for (const job of s.jobs) if (job.sourceId === id) revokeUrl(job.result?.url);
      const sources = s.sources.filter((src) => src.id !== id);
      const drafts = { ...s.drafts };
      delete drafts[id];
      const previews = { ...s.previews };
      delete previews[id];
      const jobs = s.jobs.filter((j) => j.sourceId !== id);
      const selectedId = s.selectedId === id ? (sources[0]?.id ?? null) : s.selectedId;
      return { sources, drafts, previews, jobs, selectedId };
    });
    const timer = previewTimers.get(id);
    if (timer) clearTimeout(timer);
    previewTimers.delete(id);
    previewSeq.delete(id);
  },

  selectSource: (id) => {
    if (!get().sources.some((s) => s.id === id)) return;
    set({ selectedId: id });
    schedulePreview(id);
  },

  updateDraft: (id, patch) => {
    set((s) => ({
      drafts: {
        ...s.drafts,
        [id]: { ...(s.drafts[id] ?? emptyDraft(outputFromPrefs(s.prefs))), ...patch },
      },
    }));
    schedulePreview(id);
  },

  convertSelected: () => {
    const s = get();
    if (!s.selectedId) return;
    launchJobs(s, [s.selectedId]);
  },

  convertAll: () => {
    const s = get();
    launchJobs(
      s,
      s.sources.map((src) => src.id),
    );
  },

  cancelJob: (id) => {
    canceledIds.add(id);
  },

  cancelAll: () => {
    for (const job of get().jobs) {
      if (job.status === "pending" || job.status === "running") canceledIds.add(job.id);
    }
  },

  retryJob: (id) => {
    const job = get().jobs.find((j) => j.id === id);
    if (!job || job.status !== "error") return;
    const source = get().sources.find((s) => s.id === job.sourceId);
    const draft = get().drafts[job.sourceId];
    if (!source || !draft) return;
    patchJob(id, { status: "pending", progress: 0, phase: "", error: undefined });
    void runJob(id, source, draft);
  },

  clearJobs: () => {
    set((s) => {
      for (const job of s.jobs) revokeUrl(job.result?.url);
      return { jobs: [] };
    });
  },

  setPrefs: (patch) => {
    set((s) => {
      const prefs = { ...s.prefs, ...patch };
      savePreferences(prefs);
      return { prefs };
    });
  },

  setOutput: (patch) => {
    set((s) => {
      const prefs: Preferences = {
        ...s.prefs,
        ...(patch.format !== undefined ? { outputFormat: patch.format } : {}),
        ...(patch.quality !== undefined ? { quality: patch.quality } : {}),
        ...(patch.stripMetadata !== undefined ? { stripMetadata: patch.stripMetadata } : {}),
      };
      savePreferences(prefs);
      const drafts = { ...s.drafts };
      for (const id of Object.keys(drafts)) {
        drafts[id] = { ...drafts[id], output: { ...drafts[id].output, ...patch } };
      }
      return { prefs, drafts };
    });
    const id = get().selectedId;
    if (id) schedulePreview(id);
  },

  applyToAll: () => {
    const template = get().drafts[get().selectedId ?? ""];
    if (!template) return;
    set((s) => {
      const drafts = { ...s.drafts };
      for (const src of s.sources) {
        if (src.id === s.selectedId) continue;
        drafts[src.id] = { ...template };
      }
      return { drafts };
    });
  },

  setCapabilities: (capabilities) => set({ capabilities }),

  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
}));

// Detección de capacidades, una vez, en el cliente.
if (typeof window !== "undefined") {
  const g = globalThis as Record<string, unknown>;
  void detectCapabilities({
    OffscreenCanvas: g.OffscreenCanvas,
    VideoEncoder: g.VideoEncoder,
    VideoDecoder: g.VideoDecoder,
    AudioEncoder: g.AudioEncoder,
    AudioDecoder: g.AudioDecoder,
    VideoFrame: g.VideoFrame,
    SharedArrayBuffer: g.SharedArrayBuffer,
    WebAssembly: g.WebAssembly,
    WebGLRenderingContext: g.WebGLRenderingContext,
    WebGL2RenderingContext: g.WebGL2RenderingContext,
    hardwareConcurrency: (globalThis as { navigator?: { hardwareConcurrency?: number } }).navigator
      ?.hardwareConcurrency,
  }).then((capabilities) => useTolva.getState().setCapabilities(capabilities));
}
