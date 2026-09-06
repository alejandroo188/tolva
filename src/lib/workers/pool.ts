/**
 * Pool de workers de imagen (Comlink) para el hilo principal.
 *
 * - Tamaño por defecto: `clamp(hardwareConcurrency - 1, 2, 6)`.
 * - Cola FIFO de workers libres (round-robin); la concurrencia nunca supera el
 *   tamaño del pool (§8.2).
 * - Reintento una vez ante un fallo y reposición del worker si se cae.
 * - Los `sourceBytes` se clonan (no se transfieren) para poder reintentar; el
 *   resultado sí se transfiere cero-copia desde el worker.
 */

import * as Comlink from "comlink";
import type { EditRecipe, ExifOrientation } from "@/lib/domain/types";
import type {
  CancelToken,
  ImageJobResult,
  ImageWorkerApi,
  ProbeResult,
  ProgressCallback,
} from "./types";

/** Estadísticas observables del pool (para el harness y las métricas). */
export interface PoolStats {
  size: number;
  active: number;
  maxActive: number;
  completed: number;
  failed: number;
  retried: number;
  respawned: number;
}

interface WorkerHandle {
  worker: Worker;
  api: Comlink.Remote<ImageWorkerApi>;
  idle: boolean;
  alive: boolean;
  /** Rechaza el trabajo en curso si el worker muere de forma abrupta. */
  onDeath: Array<(err: Error) => void>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Tamaño por defecto del pool según los núcleos disponibles. */
export function defaultPoolSize(): number {
  const hc =
    typeof navigator !== "undefined" && navigator.hardwareConcurrency > 0
      ? navigator.hardwareConcurrency
      : 4;
  return clamp(hc - 1, 2, 6);
}

/** ¿Es un error de cancelación (no un fallo del worker)? */
function isCanceledError(err: unknown): boolean {
  const e = err as { name?: string; message?: string };
  return (
    e?.name === "CanceledError" || (typeof e?.message === "string" && /cancel/i.test(e.message))
  );
}

export class ImageWorkerPool {
  private handles: WorkerHandle[] = [];
  private waiters: Array<() => void> = [];
  private closed = false;
  private stats: PoolStats = {
    size: 0,
    active: 0,
    maxActive: 0,
    completed: 0,
    failed: 0,
    retried: 0,
    respawned: 0,
  };

  constructor(size?: number) {
    const n = clamp(size ?? defaultPoolSize(), 1, 6);
    for (let i = 0; i < n; i += 1) this.spawn();
  }

  private spawn(): void {
    const worker = new Worker(new URL("./image.worker.ts", import.meta.url), { type: "module" });
    const api = Comlink.wrap<ImageWorkerApi>(worker);
    const handle: WorkerHandle = { worker, api, idle: true, alive: true, onDeath: [] };
    // `self.close()` no dispara ningún evento; una excepción no capturada en el
    // worker sí dispara `onerror` y lo termina, que es lo que detectamos aquí.
    worker.onerror = () => this.handleWorkerDeath(handle);
    this.handles.push(handle);
    this.stats.size = this.handles.length;
  }

  /** Repone un worker caído (o que falló) por uno nuevo. */
  private replaceHandle(h: WorkerHandle): void {
    const index = this.handles.indexOf(h);
    if (index < 0) return;
    h.alive = false;
    try {
      h.worker.terminate();
    } catch {
      /* ya estaba terminado */
    }
    this.handles.splice(index, 1);
    this.stats.respawned += 1;
    this.spawn();
  }

  /** El worker terminó de forma abrupta: se repone y se rechaza su trabajo pendiente. */
  private handleWorkerDeath(h: WorkerHandle): void {
    if (!h.alive) return;
    this.replaceHandle(h);
    const pending = h.onDeath.splice(0);
    const err = new Error("El worker finalizó inesperadamente");
    for (const reject of pending) reject(err);
  }

  /** Ejecuta `task` y la rechaza si el worker muere a mitad de camino. */
  private raceWithDeath<T>(handle: WorkerHandle, task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const onDeath = (err: Error) => reject(err);
      handle.onDeath.push(onDeath);
      const cleanup = () => {
        const i = handle.onDeath.indexOf(onDeath);
        if (i >= 0) handle.onDeath.splice(i, 1);
      };
      task().then(
        (value) => {
          cleanup();
          resolve(value);
        },
        (err) => {
          cleanup();
          reject(err);
        },
      );
    });
  }

  /** Espera a un worker libre (FIFO). */
  private async acquire(): Promise<WorkerHandle> {
    for (;;) {
      const handle = this.handles.find((h) => h.alive && h.idle);
      if (handle) {
        handle.idle = false;
        this.stats.active += 1;
        this.stats.maxActive = Math.max(this.stats.maxActive, this.stats.active);
        return handle;
      }
      if (this.closed) throw new Error("El pool de workers está cerrado");
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
  }

  private release(handle: WorkerHandle): void {
    handle.idle = true;
    this.stats.active = Math.max(0, this.stats.active - 1);
    const next = this.waiters.shift();
    if (next) next();
  }

  /**
   * Ejecuta la receta en un worker del pool. Reintenta una vez ante fallo y
   * repone el worker si se cae. La cancelación se propaga sin reintentar.
   */
  async runJob(
    recipe: EditRecipe,
    sourceBytes: ArrayBuffer,
    cancel: CancelToken,
    onProgress: ProgressCallback,
  ): Promise<ImageJobResult> {
    return this.runWithHandle(recipe, sourceBytes, cancel, onProgress, 1);
  }

  /**
   * Decodifica en un worker y devuelve las dimensiones orientadas. Igual que
   * `runJob`, usa un worker libre y repone el worker si se cae (sin reintento:
   * la ingesta vuelve a llamar si es necesario).
   */
  async probe(
    sourceBytes: ArrayBuffer,
    mime: string,
    exifOrientation: ExifOrientation,
  ): Promise<ProbeResult> {
    if (this.closed) throw new Error("El pool de workers está cerrado");
    const handle = await this.acquire();
    try {
      return await this.raceWithDeath(handle, () =>
        handle.api.probe(sourceBytes, mime, exifOrientation),
      );
    } catch (err) {
      this.replaceHandle(handle);
      throw err;
    } finally {
      this.release(handle);
    }
  }

  private async runWithHandle(
    recipe: EditRecipe,
    sourceBytes: ArrayBuffer,
    cancel: CancelToken,
    onProgress: ProgressCallback,
    attemptsLeft: number,
  ): Promise<ImageJobResult> {
    if (this.closed) throw new Error("El pool de workers está cerrado");
    const handle = await this.acquire();
    try {
      const result = await this.raceWithDeath(handle, () =>
        handle.api.runJob(recipe, sourceBytes, cancel, onProgress),
      );
      this.stats.completed += 1;
      return result;
    } catch (err) {
      if (isCanceledError(err)) {
        throw err;
      }
      // El worker falló o se cayó: se repone y se reintenta una vez.
      this.replaceHandle(handle);
      if (attemptsLeft > 0) {
        this.stats.retried += 1;
        return this.runWithHandle(recipe, sourceBytes, cancel, onProgress, attemptsLeft - 1);
      }
      this.stats.failed += 1;
      throw err;
    } finally {
      this.release(handle);
    }
  }

  getStats(): PoolStats {
    return { ...this.stats };
  }

  /** Pone a cero los contadores (mantiene el tamaño del pool). */
  resetStats(): void {
    this.stats = {
      size: this.stats.size,
      active: 0,
      maxActive: 0,
      completed: 0,
      failed: 0,
      retried: 0,
      respawned: 0,
    };
  }

  /** Marca el siguiente trabajo (en un único worker) para que falle una vez. */
  async failNextJob(): Promise<void> {
    const handle = this.handles.find((h) => h.alive);
    if (!handle) return;
    await handle.api._failNextJob();
  }

  /** Cierra abruptamente un worker (para probar la recuperación del pool). */
  crashWorker(): void {
    const handle = this.handles.find((h) => h.alive);
    if (!handle) return;
    void handle.api._crash().catch(() => {});
  }

  async close(): Promise<void> {
    this.closed = true;
    for (const handle of this.handles) {
      handle.alive = false;
      try {
        handle.worker.terminate();
      } catch {
        /* ignorar */
      }
    }
    this.handles = [];
    const waiters = this.waiters.splice(0);
    for (const wake of waiters) wake();
  }
}
