/**
 * Fachada del hilo principal para el motor de imagen (§8.2).
 *
 * Valida la receta, rasteriza SVG en el hilo principal (única etapa que necesita
 * DOM) y delega el resto a un pool de workers Comlink. Expone una única
 * `convert` para el harness y para la futura UI (Hito 4).
 */

import * as Comlink from "comlink";
import { validateRecipe } from "@/lib/domain/recipe";
import { detectFormat } from "@/lib/media/sniff";
import type { EditRecipe } from "@/lib/domain/types";
import type { CancelToken, ImageJobResult, ProgressCallback } from "@/lib/workers/types";
import { ImageWorkerPool, type PoolStats } from "@/lib/workers/pool";

export interface ConvertOptions {
  /** Progreso (0→1) y fase, invocado desde el worker vía proxy. */
  onProgress?: ProgressCallback;
  /** Si devuelve `true`, se cancela el trabajo en curso. */
  isAborted?: () => boolean;
}

/**
 * Rasteriza un SVG a PNG en el hilo principal (`createImageBitmap` no decodifica
 * SVG, y el worker no tiene DOM). Devuelve los bytes PNG.
 */
export async function rasterizeSvg(
  svgBytes: ArrayBuffer,
  width?: number,
  height?: number,
): Promise<ArrayBuffer> {
  const blob = new Blob([svgBytes], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("No se pudo rasterizar el SVG"));
      img.src = url;
    });
    const w = width && width > 0 ? width : img.naturalWidth || 1;
    const h = height && height > 0 ? height : img.naturalHeight || 1;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D no disponible");
    ctx.drawImage(img, 0, 0, w, h);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob devolvió null"))),
        "image/png",
      );
    });
    return await png.arrayBuffer();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export class ImagePipeline {
  private pool: ImageWorkerPool | null = null;
  private readonly poolSize: number | undefined;

  constructor(poolSize?: number) {
    this.poolSize = poolSize;
  }

  private getPool(): ImageWorkerPool {
    if (!this.pool) this.pool = new ImageWorkerPool(this.poolSize);
    return this.pool;
  }

  stats(): PoolStats | null {
    return this.pool ? this.pool.getStats() : null;
  }

  resetStats(): void {
    this.pool?.resetStats();
  }

  async failNextJob(): Promise<void> {
    await this.getPool().failNextJob();
  }

  crashWorker(): void {
    this.getPool().crashWorker();
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  /** Convierte la fuente según la receta. Valida, rasteriza SVG y usa el pool. */
  async convert(
    recipe: EditRecipe,
    sourceBytes: ArrayBuffer,
    options: ConvertOptions = {},
  ): Promise<ImageJobResult> {
    const valid = validateRecipe(recipe);
    let bytes = sourceBytes;
    let source = valid.source;

    if (detectFormat(sourceBytes) === "svg" || source.type === "image/svg+xml") {
      bytes = await rasterizeSvg(sourceBytes, source.width, source.height);
      source = { ...source, type: "image/png" };
    }

    const pool = this.getPool();
    const onProgress = Comlink.proxy<ProgressCallback>(options.onProgress ?? (() => {}));
    const cancel = Comlink.proxy<CancelToken>({
      isAborted: () => (options.isAborted ? options.isAborted() : false),
    });

    // `Comlink.proxy()` devuelve el objeto marcado, sin `releaseProxy` (ese símbolo
    // sólo existe en los proxies *recibidos* vía `wrap`). Los proxies enviados se
    // liberan solos cuando el worker los recolecta (FinalizationRegistry de Comlink).
    return await pool.runJob({ ...valid, source }, bytes, cancel, onProgress);
  }
}
