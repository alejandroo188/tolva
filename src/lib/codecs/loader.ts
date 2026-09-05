/**
 * Cargadores diferidos de códecs WASM (jSquash).
 *
 * Cada códec se inicializa **sólo la primera vez que se usa** (`lazy`), de modo
 * que ningún `.wasm` se descarga hasta que se pide el formato correspondiente
 * (§8.6, verificado por el E2E de presupuesto de carga diferida).
 *
 * Dos familias de códecs, cada una con su API de inicialización:
 * - **Emscripten** (avif, jxl, webp): resuelven el `.wasm` en tiempo de
 *   ejecución vía `locateFile`; le damos una ruta estable bajo `/codecs/`.
 * - **wasm-bindgen** (resize): `init(ruta)` acepta directamente la URL del
 *   `.wasm`.
 *
 * Los binarios los copia `scripts/copy-codecs.ts` a `public/codecs/`.
 */

import avifEncode, { init as initAvifEncode } from "@jsquash/avif/encode";
import avifDecode, { init as initAvifDecode } from "@jsquash/avif/decode";
import jxlEncode, { init as initJxlEncode } from "@jsquash/jxl/encode";
import jxlDecode, { init as initJxlDecode } from "@jsquash/jxl/decode";
import webpEncode, { init as initWebpEncode } from "@jsquash/webp/encode";
import resizeImage, { initResize } from "@jsquash/resize";

/** Base URL de los binarios servidos desde `public/codecs/`. */
const CODEC_BASE = "/codecs";

/** `locateFile` para los códecs Emscripten: resuelve al subdirectorio del códec. */
function locateFile(codec: string): (path: string) => string {
  return (path: string) => `${CODEC_BASE}/${codec}/${path}`;
}

/** Envuelve una inicialización en un singleton perezoso (nunca falla el primero). */
function lazy<T>(init: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => {
    if (promise === null) promise = init();
    return promise;
  };
}

const avifEncodeReady = lazy(() => initAvifEncode({ locateFile: locateFile("avif") }));
const avifDecodeReady = lazy(() => initAvifDecode({ locateFile: locateFile("avif") }));
const jxlEncodeReady = lazy(() => initJxlEncode({ locateFile: locateFile("jxl") }));
const jxlDecodeReady = lazy(() => initJxlDecode({ locateFile: locateFile("jxl") }));
const webpEncodeReady = lazy(() => initWebpEncode({ locateFile: locateFile("webp") }));
const resizeReady = lazy(() => initResize(`${CODEC_BASE}/resize/squoosh_resize_bg.wasm`));

/** Opciones de codificación comunes: calidad normalizada 0–100. */
interface EncodeOptions {
  quality: number;
}

/** Codifica a AVIF (libavif). `data` es RGBA 8 bits. */
export async function encodeAvif(data: ImageData, options: EncodeOptions): Promise<ArrayBuffer> {
  await avifEncodeReady();
  return avifEncode(data, { quality: options.quality });
}

/** Decodifica AVIF → `ImageData` RGBA. */
export async function decodeAvif(bytes: ArrayBuffer): Promise<ImageData | null> {
  await avifDecodeReady();
  return avifDecode(bytes);
}

/** Codifica a JPEG XL. `data` es RGBA 8 bits. */
export async function encodeJxl(data: ImageData, options: EncodeOptions): Promise<ArrayBuffer> {
  await jxlEncodeReady();
  return jxlEncode(data, { quality: options.quality });
}

/** Decodifica JPEG XL → `ImageData` RGBA. */
export async function decodeJxl(bytes: ArrayBuffer): Promise<ImageData | null> {
  await jxlDecodeReady();
  return jxlDecode(bytes);
}

/** Codifica a WebP. `data` es RGBA 8 bits. */
export async function encodeWebp(data: ImageData, options: EncodeOptions): Promise<ArrayBuffer> {
  await webpEncodeReady();
  return webpEncode(data, { quality: options.quality });
}

/** Remuestrea `data` a `width`×`height` con Lanczos3 (alta calidad). */
export async function resizeLanczos(
  data: ImageData,
  width: number,
  height: number,
): Promise<ImageData> {
  await resizeReady();
  return resizeImage(data, { width, height, method: "lanczos3" });
}
