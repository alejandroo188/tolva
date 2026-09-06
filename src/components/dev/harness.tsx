"use client";

/**
 * Harness de integración (§8.2): expone `window.__tolva` para que Playwright
 * conduzca los workers directamente y afirme sobre la salida real (bytes
 * mágicos, progreso, cola, memoria, reintento y recuperación).
 *
 * Sólo se monta en `/dev/harness`, que queda excluida del build de producción.
 */

import { useEffect } from "react";
import { ImagePipeline } from "@/lib/media/image-pipeline";
import { readExif, type ExifInfo } from "@/lib/media/exif";
import { detectFormat } from "@/lib/media/sniff";
import { detectCapabilities, type Capabilities, type DetectionGlobals } from "@/lib/capabilities";
import { defaultPoolSize, type PoolStats } from "@/lib/workers/pool";
import type { EditRecipe, ExifOrientation } from "@/lib/domain/types";
import type { ConvertOptions } from "@/lib/media/image-pipeline";
import type { ImageJobResult } from "@/lib/workers/types";

interface TolvaHarness {
  convert(
    recipe: EditRecipe,
    sourceBytes: ArrayBuffer,
    options?: ConvertOptions,
  ): Promise<ImageJobResult>;
  convertBatch(
    recipes: EditRecipe[],
    sources: ArrayBuffer[],
    poolSize?: number,
    options?: ConvertOptions,
  ): Promise<ImageJobResult[]>;
  readExif(bytes: ArrayBuffer): ExifInfo;
  detectFormat(bytes: ArrayBuffer): ReturnType<typeof detectFormat>;
  probe(
    sourceBytes: ArrayBuffer,
    mime: string,
    exifOrientation: ExifOrientation,
  ): Promise<{ width: number; height: number }>;
  capabilities(): Promise<Capabilities>;
  poolStats(): PoolStats | null;
  defaultPoolSize(): number;
  failNextJob(): Promise<void>;
  crashWorker(): void;
  resetStats(): void;
  closeWorkers(): Promise<void>;
}

declare global {
  interface Window {
    __tolva?: TolvaHarness;
  }
}

/** Captura los globals del navegador para `detectCapabilities` (§8.1). */
function captureGlobals(): DetectionGlobals {
  const g = globalThis as Record<string, unknown>;
  return {
    OffscreenCanvas: g.OffscreenCanvas,
    VideoEncoder: g.VideoEncoder,
    VideoDecoder: g.VideoDecoder,
    AudioEncoder: g.AudioEncoder,
    AudioDecoder: g.AudioDecoder,
    VideoFrame: g.VideoFrame,
    ImageDecoder: g.ImageDecoder,
    SharedArrayBuffer: g.SharedArrayBuffer,
    WebAssembly: g.WebAssembly,
    WebGLRenderingContext: g.WebGLRenderingContext,
    WebGL2RenderingContext: g.WebGL2RenderingContext,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
}

export function Harness() {
  useEffect(() => {
    let pipeline: ImagePipeline | null = null;

    const getPipeline = (poolSize?: number): ImagePipeline => {
      if (poolSize !== undefined) {
        if (pipeline) void pipeline.close();
        pipeline = new ImagePipeline(poolSize);
      } else if (!pipeline) {
        pipeline = new ImagePipeline(defaultPoolSize());
      }
      return pipeline;
    };

    window.__tolva = {
      convert: (recipe, sourceBytes, options) =>
        getPipeline().convert(recipe, sourceBytes, options),
      convertBatch: (recipes, sources, poolSize, options) => {
        const p = getPipeline(poolSize ?? 3);
        return Promise.all(recipes.map((recipe, i) => p.convert(recipe, sources[i], options)));
      },
      readExif,
      detectFormat: (bytes) => detectFormat(bytes),
      probe: (bytes, mime, orientation) => getPipeline().probe(bytes, mime, orientation),
      capabilities: () => detectCapabilities(captureGlobals()),
      poolStats: () => pipeline?.stats() ?? null,
      defaultPoolSize,
      failNextJob: () => getPipeline().failNextJob(),
      crashWorker: () => getPipeline().crashWorker(),
      resetStats: () => pipeline?.resetStats(),
      closeWorkers: async () => {
        if (pipeline) {
          await pipeline.close();
          pipeline = null;
        }
      },
    };

    return () => {
      void window.__tolva?.closeWorkers();
      delete window.__tolva;
    };
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Harness de imagen</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ruta sólo de desarrollo para las pruebas de integración del §8.2. La API vive en{" "}
        <code className="font-mono">window.__tolva</code>.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Disponible tras el montaje: la API vive en <code className="font-mono">window.__tolva</code>
        .
      </p>
    </main>
  );
}
