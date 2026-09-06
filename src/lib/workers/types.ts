/**
 * Tipos compartidos entre el hilo principal y el worker de imagen.
 *
 * Fichero de tipos **sin código ejecutable**: se importa desde ambos lados de
 * la frontera Comlink sin arrastrar APIs del navegador.
 */

import type { EditRecipe, ExifOrientation } from "@/lib/domain/types";

/** Dimensiones orientadas devueltas por `probe` (sin codificar). */
export interface ProbeResult {
  width: number;
  height: number;
}

/** Fase del procesado, para el progreso y el diagnóstico. */
export type PipelinePhase =
  | "decode"
  | "crop"
  | "rotate"
  | "straighten"
  | "flip"
  | "resize"
  | "adjust"
  | "watermark"
  | "encode";

/** Callback de progreso (0→1) invocado por el worker vía Comlink.proxy. */
export type ProgressCallback = (progress: number, phase: PipelinePhase) => void;

/** Resultado de un trabajo de imagen: bytes ya codificados (transferible). */
export interface ImageJobResult {
  /** Bytes del fichero de salida (se transfiere, no se copia). */
  data: ArrayBuffer;
  /** Dimensiones del resultado en píxeles. */
  width: number;
  height: number;
  /** MIME del formato de salida. */
  mime: string;
  /** Tamaño en bytes. */
  bytes: number;
}

/** Un trabajo de imagen listo para el worker. */
export interface ImageJob {
  recipe: EditRecipe;
  /** Bytes de la fuente (se transfieren). */
  sourceBytes: ArrayBuffer;
}

/**
 * Token de cancelación (proxy Comlink): el worker llama a `isAborted()` para
 * saber si debe interrumpirse. Es un **método** y no una propiedad porque
 * Comlink convierte el acceso a propiedades en una promesa; un método es la
 * forma idiomática de leer estado vivo del hilo principal en cada consulta.
 */
export interface CancelToken {
  isAborted(): boolean;
}

/**
 * La API que el worker expone vía `Comlink.expose`.
 *
 * `runJob` recibe el `recipe` validado, los bytes de la fuente, un token de
 * cancelación y un callback de progreso (ambos proxies).
 */
export interface ImageWorkerApi {
  runJob(
    recipe: EditRecipe,
    sourceBytes: ArrayBuffer,
    cancel: CancelToken,
    onProgress: ProgressCallback,
  ): Promise<ImageJobResult>;

  /**
   * Decodifica la fuente y devuelve sus dimensiones **ya orientadas** (sin
   * codificar). Lo usa la ingesta para rellenar `source.width`/`height` sin
   * decodificar píxeles en el hilo principal (§4.2).
   */
  probe(
    sourceBytes: ArrayBuffer,
    mime: string,
    exifOrientation: ExifOrientation,
  ): Promise<ProbeResult>;

  /** Sólo tests: hace fallar el siguiente trabajo (para probar reintento). */
  _failNextJob(): void;
  /** Sólo tests: cierra el worker abruptamente (para probar recuperación). */
  _crash(): void;
}
