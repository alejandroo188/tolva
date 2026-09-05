/**
 * Worker de imagen (Comlink): ejecuta la receta sobre `OffscreenCanvas`.
 *
 * Decodifica (nativa + jSquash + UTIF2 + gifuct-js), aplica la orientación EXIF
 * a los píxeles, ejecuta las operaciones en orden canónico y codifica a JPEG,
 * PNG, WebP, AVIF, JXL, GIF y BMP. Todo fuera del hilo principal; cada códec se
 * inicializa sólo cuando se pide su formato (§8.6).
 */

import * as Comlink from "comlink";
import { parseGIF, decompressFrames } from "gifuct-js";
import type { ParsedFrame } from "gifuct-js";
import UTIF from "utif2";

import {
  encodeAvif,
  decodeAvif,
  encodeJxl,
  decodeJxl,
  encodeWebp,
  resizeLanczos,
} from "@/lib/codecs/loader";
import { detectFormat, mimeForFormat, type DetectedFormat } from "@/lib/media/sniff";
import { stripExifApp1 } from "@/lib/media/jpeg-exif";
import { WATERMARK_FILL, WATERMARK_SHADOW } from "@/lib/media/watermark";
import { decodeBmp, encodeBmp } from "@/lib/media/bmp";
import { encodeGif } from "@/lib/media/gif";
import { sortOps } from "@/lib/domain/recipe";
import { chooseAlgorithm, planReductionSteps } from "@/lib/domain/resize";
import { contain, cover } from "@/lib/domain/geometry";
import { encoderQuality } from "@/lib/domain/quality";
import type {
  AdjustOp,
  CropOp,
  EditRecipe,
  ExifOrientation,
  FlipOp,
  Op,
  OutputSpec,
  ResizeOp,
  RotateOp,
  WatermarkOp,
  WatermarkPosition,
} from "@/lib/domain/types";
import type {
  CancelToken,
  ImageJobResult,
  ImageWorkerApi,
  PipelinePhase,
  ProgressCallback,
} from "./types";

/** Error específico de cancelación: se distingue de un fallo real. */
class CanceledError extends Error {
  constructor() {
    super("Operación cancelada");
    this.name = "CanceledError";
  }
}

/** Error de pipeline con mensaje legible (formato no soportado, etc.). */
class PipelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineError";
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Utilidades de ImageData / canvas
// ────────────────────────────────────────────────────────────────────────────

/** Dibuja un `ImageBitmap` y extrae su `ImageData` (RGBA). */
async function bitmapToImageData(bitmap: ImageBitmap): Promise<ImageData> {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PipelineError("OffscreenCanvas 2D no disponible");
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

/** Convierte un `Uint8Array` en un `ArrayBuffer` transferible de tamaño exacto. */
function toTransferable(u8: Uint8Array): ArrayBuffer {
  const buffer = u8.buffer as ArrayBuffer;
  if (u8.byteOffset === 0 && u8.byteLength === buffer.byteLength) return buffer;
  return buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}

/** Clampea un byte de canal a [0, 255] con redondeo. */
function clampByte(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

/**
 * Notifica progreso sin propagar errores del proxy. Devuelve una promesa para
 * poder **esperar** (flush) el último avance antes de devolver el resultado:
 * si no, el `1` final puede llegar al hilo principal *después* de que la
 * promesa de `convert` se resuelva (carrera observable en WebKit).
 */
async function report(cb: ProgressCallback, progress: number, phase: PipelinePhase): Promise<void> {
  try {
    await cb(progress, phase);
  } catch {
    /* el canal de progreso no debe romper el trabajo */
  }
}

/** Lanza si se ha pedido cancelación. */
async function checkCancel(cancel: CancelToken): Promise<void> {
  if (cancel && (await cancel.isAborted())) throw new CanceledError();
}

// ────────────────────────────────────────────────────────────────────────────
// Decodificación
// ────────────────────────────────────────────────────────────────────────────

/** MIME → formato detectado (fallback cuando no hay firma de bytes clara). */
function formatFromMime(mime: string): DetectedFormat | null {
  const m = mime.toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg") return "jpeg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/avif") return "avif";
  if (m === "image/jxl") return "jxl";
  if (m === "image/gif") return "gif";
  if (m === "image/bmp") return "bmp";
  if (m === "image/tiff") return "tiff";
  if (m === "image/svg+xml") return "svg";
  return null;
}

/** Compone un fotograma `patch` de gifuct-js sobre un buffer RGBA de tamaño completo. */
function compositeGifFrame(
  target: Uint8ClampedArray,
  targetWidth: number,
  targetHeight: number,
  frame: ParsedFrame,
): void {
  const { left, top, width, height } = frame.dims;
  const patch = frame.patch;
  for (let y = 0; y < height; y += 1) {
    const ty = top + y;
    if (ty < 0 || ty >= targetHeight) continue;
    for (let x = 0; x < width; x += 1) {
      const tx = left + x;
      if (tx < 0 || tx >= targetWidth) continue;
      const si = (y * width + x) * 4;
      const ti = (ty * targetWidth + tx) * 4;
      const a = patch[si + 3];
      if (a === 0) continue;
      target[ti] = patch[si];
      target[ti + 1] = patch[si + 1];
      target[ti + 2] = patch[si + 2];
      target[ti + 3] = a;
    }
  }
}

/** Decodifica un GIF (primer fotograma compuesto) vía gifuct-js. */
function decodeGif(bytes: ArrayBuffer): ImageData {
  const gif = parseGIF(bytes);
  const frames = decompressFrames(gif, true);
  if (frames.length === 0) throw new PipelineError("GIF sin fotogramas");
  const { width, height } = gif.lsd;
  const out = new ImageData(width, height);
  compositeGifFrame(out.data, width, height, frames[0]);
  return out;
}

/** Decodifica un TIFF (primera página) vía UTIF2. */
function decodeTiff(bytes: ArrayBuffer): ImageData {
  const u8 = new Uint8Array(bytes);
  const ifds = UTIF.decode(u8);
  if (ifds.length === 0) throw new PipelineError("TIFF sin imágenes");
  const page = ifds[0];
  UTIF.decodeImage(u8, page, ifds);
  const rgba = UTIF.toRGBA8(page);
  return new ImageData(new Uint8ClampedArray(rgba), page.width, page.height);
}

/** Decodifica `sourceBytes` a `ImageData` según su formato real. */
async function decode(sourceBytes: ArrayBuffer, mime: string): Promise<ImageData> {
  const format = detectFormat(sourceBytes) ?? formatFromMime(mime);
  switch (format) {
    case "jpeg":
    case "png":
    case "webp": {
      // `createImageBitmap` aplica la orientación EXIF automáticamente (Chromium
      // ignora `imageOrientation: "none"`). Para decodificar los píxeles crudos y
      // aplicar la orientación nosotros en `applyOrientation`, quitamos antes el
      // segmento APP1 de EXIF del JPEG (sin EXIF la llamada es barata: no copia).
      const bytes = format === "jpeg" ? stripExifApp1(sourceBytes) : sourceBytes;
      const blob = new Blob([bytes], { type: mimeForFormat(format) });
      const bitmap = await createImageBitmap(blob);
      try {
        return await bitmapToImageData(bitmap);
      } finally {
        bitmap.close();
      }
    }
    case "gif":
      return decodeGif(sourceBytes);
    case "avif": {
      const data = await decodeAvif(sourceBytes);
      if (!data) throw new PipelineError("No se pudo decodificar AVIF");
      return data;
    }
    case "jxl": {
      const data = await decodeJxl(sourceBytes);
      if (!data) throw new PipelineError("No se pudo decodificar JPEG XL");
      return data;
    }
    case "tiff":
      return decodeTiff(sourceBytes);
    case "bmp": {
      const decoded = decodeBmp(sourceBytes);
      if (!decoded) throw new PipelineError("BMP no válido");
      return new ImageData(
        decoded.data as Uint8ClampedArray<ArrayBuffer>,
        decoded.width,
        decoded.height,
      );
    }
    default:
      throw new PipelineError("Formato de imagen no soportado");
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Orientación EXIF (Squoosh drawOrientedImage)
// ────────────────────────────────────────────────────────────────────────────

/** Matriz 2D [a,b,c,d,e,f] para cada orientación EXIF (sobre contexto identidad). */
function orientationTransform(
  orientation: ExifOrientation,
  width: number,
  height: number,
): [number, number, number, number, number, number] {
  switch (orientation) {
    case 2:
      return [-1, 0, 0, 1, width, 0];
    case 3:
      return [-1, 0, 0, -1, width, height];
    case 4:
      return [1, 0, 0, -1, 0, height];
    case 5:
      return [0, 1, 1, 0, 0, 0];
    case 6:
      return [0, 1, -1, 0, height, 0];
    case 7:
      return [0, -1, -1, 0, height, width];
    case 8:
      return [0, -1, 1, 0, 0, width];
    default:
      return [1, 0, 0, 1, 0, 0];
  }
}

/** Endereza la imagen según la orientación EXIF (las 5–8 intercambian dimensiones). */
async function applyOrientation(data: ImageData, orientation: ExifOrientation): Promise<ImageData> {
  if (orientation === 1) return data;
  const swaps = orientation >= 5 && orientation <= 8;
  const outW = swaps ? data.height : data.width;
  const outH = swaps ? data.width : data.height;

  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PipelineError("OffscreenCanvas 2D no disponible");
  ctx.setTransform(...orientationTransform(orientation, data.width, data.height));

  const bitmap = await createImageBitmap(data);
  try {
    ctx.drawImage(bitmap, 0, 0);
  } finally {
    bitmap.close();
  }
  return ctx.getImageData(0, 0, outW, outH);
}

// ────────────────────────────────────────────────────────────────────────────
// Operaciones de la receta
// ────────────────────────────────────────────────────────────────────────────

async function applyCrop(data: ImageData, op: CropOp): Promise<ImageData> {
  const w = Math.max(1, Math.min(op.width, data.width - Math.min(op.x, data.width)));
  const h = Math.max(1, Math.min(op.height, data.height - Math.min(op.y, data.height)));
  const x = Math.min(op.x, data.width - w);
  const y = Math.min(op.y, data.height - h);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PipelineError("OffscreenCanvas 2D no disponible");
  const bitmap = await createImageBitmap(data);
  try {
    ctx.drawImage(bitmap, x, y, w, h, 0, 0, w, h);
  } finally {
    bitmap.close();
  }
  return ctx.getImageData(0, 0, w, h);
}

async function applyRotate(data: ImageData, degrees: RotateOp["degrees"]): Promise<ImageData> {
  const swaps = degrees === 90 || degrees === 270;
  const w = swaps ? data.height : data.width;
  const h = swaps ? data.width : data.height;

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PipelineError("OffscreenCanvas 2D no disponible");
  ctx.translate(w / 2, h / 2);
  ctx.rotate((degrees * Math.PI) / 180);

  const bitmap = await createImageBitmap(data);
  try {
    ctx.drawImage(bitmap, -data.width / 2, -data.height / 2);
  } finally {
    bitmap.close();
  }
  return ctx.getImageData(0, 0, w, h);
}

async function applyFlip(data: ImageData, axis: FlipOp["axis"]): Promise<ImageData> {
  const canvas = new OffscreenCanvas(data.width, data.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PipelineError("OffscreenCanvas 2D no disponible");
  if (axis === "horizontal") {
    ctx.translate(data.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, data.height);
    ctx.scale(1, -1);
  }
  const bitmap = await createImageBitmap(data);
  try {
    ctx.drawImage(bitmap, 0, 0);
  } finally {
    bitmap.close();
  }
  return ctx.getImageData(0, 0, data.width, data.height);
}

/** Remuestreo nativo (bilineal) vía `drawImage`. */
async function drawResize(data: ImageData, width: number, height: number): Promise<ImageData> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PipelineError("OffscreenCanvas 2D no disponible");
  const bitmap = await createImageBitmap(data);
  try {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
  } finally {
    bitmap.close();
  }
  return ctx.getImageData(0, 0, width, height);
}

/** Remuestrea a `width`×`height` eligiendo el algoritmo según el factor de escala. */
async function resample(data: ImageData, width: number, height: number): Promise<ImageData> {
  if (data.width === width && data.height === height) return data;
  const scale = Math.min(width / data.width, height / data.height);
  const algorithm = chooseAlgorithm(scale);
  if (algorithm === "none") return data;
  if (algorithm === "bilinear") return drawResize(data, width, height);

  // Lanczos3 con reducción por pasos para evitar aliasing en grandes reducciones.
  const steps = planReductionSteps({ width: data.width, height: data.height }, { width, height });
  let current = data;
  for (const step of steps) {
    current = await resizeLanczos(current, step.width, step.height);
  }
  return current;
}

async function applyResize(data: ImageData, op: ResizeOp): Promise<ImageData> {
  const current = { width: data.width, height: data.height };
  const target = { width: op.width, height: op.height };

  if (op.mode === "fill") {
    return resample(data, op.width, op.height);
  }
  if (op.mode === "cover") {
    const cov = cover(current, target, { upscale: op.upscale });
    const resized = await resample(data, cov.width, cov.height);
    return applyCrop(resized, {
      type: "crop",
      x: Math.max(0, Math.floor((cov.width - op.width) / 2)),
      y: Math.max(0, Math.floor((cov.height - op.height) / 2)),
      width: op.width,
      height: op.height,
    });
  }
  // fit / contain
  const fitRes = contain(current, target, { upscale: op.upscale });
  return resample(data, fitRes.width, fitRes.height);
}

async function applyAdjust(data: ImageData, op: AdjustOp, cancel: CancelToken): Promise<ImageData> {
  const brightnessF = 1 + op.brightness / 100;
  const contrastF = 1 + op.contrast / 100;
  const saturationF = 1 + op.saturation / 100;

  const src = data.data;
  const out = new Uint8ClampedArray(src.length);
  const rowsPerCheck = 64;
  const rowStride = data.width * 4;

  for (let y = 0; y < data.height; y += 1) {
    if (y % rowsPerCheck === 0 && cancel) {
      await checkCancel(cancel);
    }
    const rowStart = y * rowStride;
    for (let x = 0; x < data.width; x += 1) {
      const i = rowStart + x * 4;
      let r = src[i];
      let g = src[i + 1];
      let b = src[i + 2];

      // Saturación por luminancia (Rec. 601).
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = lum + (r - lum) * saturationF;
      g = lum + (g - lum) * saturationF;
      b = lum + (b - lum) * saturationF;

      // Contraste alrededor del gris medio.
      r = (r - 128) * contrastF + 128;
      g = (g - 128) * contrastF + 128;
      b = (b - 128) * contrastF + 128;

      // Brillo multiplicativo.
      r *= brightnessF;
      g *= brightnessF;
      b *= brightnessF;

      out[i] = clampByte(r);
      out[i + 1] = clampByte(g);
      out[i + 2] = clampByte(b);
      out[i + 3] = src[i + 3];
    }
  }
  return new ImageData(out, data.width, data.height);
}

/** Coordenadas (x, y) de la marca de agua según la posición de brújula. */
function watermarkPosition(
  position: WatermarkPosition,
  width: number,
  height: number,
  textWidth: number,
  textHeight: number,
  pad: number,
): { x: number; y: number } {
  const centerX = (width - textWidth) / 2;
  const centerY = (height - textHeight) / 2;
  const right = width - textWidth - pad;
  const bottom = height - textHeight - pad;
  switch (position) {
    case "nw":
      return { x: pad, y: pad };
    case "n":
      return { x: centerX, y: pad };
    case "ne":
      return { x: right, y: pad };
    case "w":
      return { x: pad, y: centerY };
    case "center":
      return { x: centerX, y: centerY };
    case "e":
      return { x: right, y: centerY };
    case "sw":
      return { x: pad, y: bottom };
    case "s":
      return { x: centerX, y: bottom };
    case "se":
      return { x: right, y: bottom };
  }
}

async function applyWatermark(data: ImageData, op: WatermarkOp): Promise<ImageData> {
  const canvas = new OffscreenCanvas(data.width, data.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PipelineError("OffscreenCanvas 2D no disponible");

  const bitmap = await createImageBitmap(data);
  try {
    ctx.drawImage(bitmap, 0, 0);
  } finally {
    bitmap.close();
  }

  const fontSize = Math.max(10, Math.floor(Math.min(data.width, data.height) * 0.06));
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillStyle = WATERMARK_FILL;
  ctx.globalAlpha = op.opacity;
  ctx.shadowColor = WATERMARK_SHADOW;
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  const textWidth = ctx.measureText(op.text).width;
  const pad = Math.max(8, Math.floor(fontSize * 0.5));
  const { x, y } = watermarkPosition(
    op.position,
    data.width,
    data.height,
    textWidth,
    fontSize,
    pad,
  );
  ctx.fillText(op.text, x, y);

  return ctx.getImageData(0, 0, data.width, data.height);
}

/** Aplica una operación de la receta. */
async function applyOp(data: ImageData, op: Op, cancel: CancelToken): Promise<ImageData> {
  switch (op.type) {
    case "crop":
      return applyCrop(data, op);
    case "rotate":
      return applyRotate(data, op.degrees);
    case "flip":
      return applyFlip(data, op.axis);
    case "resize":
      return applyResize(data, op);
    case "adjust":
      return applyAdjust(data, op, cancel);
    case "watermark":
      return applyWatermark(data, op);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Codificación
// ────────────────────────────────────────────────────────────────────────────

/** Codifica `data` al formato pedido. Devuelve bytes + metadatos del resultado. */
async function encode(data: ImageData, output: OutputSpec): Promise<ImageJobResult> {
  const quality = encoderQuality(output.format, output.quality);
  let bytes: ArrayBuffer;
  let mime: string;

  switch (output.format) {
    case "jpeg": {
      const canvas = new OffscreenCanvas(data.width, data.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new PipelineError("OffscreenCanvas 2D no disponible");
      ctx.putImageData(data, 0, 0);
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: quality / 100 });
      bytes = await blob.arrayBuffer();
      mime = "image/jpeg";
      break;
    }
    case "png": {
      const canvas = new OffscreenCanvas(data.width, data.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new PipelineError("OffscreenCanvas 2D no disponible");
      ctx.putImageData(data, 0, 0);
      const blob = await canvas.convertToBlob({ type: "image/png" });
      bytes = await blob.arrayBuffer();
      mime = "image/png";
      break;
    }
    case "webp":
      bytes = await encodeWebp(data, { quality });
      mime = "image/webp";
      break;
    case "avif":
      bytes = await encodeAvif(data, { quality });
      mime = "image/avif";
      break;
    case "jxl":
      bytes = await encodeJxl(data, { quality });
      mime = "image/jxl";
      break;
    case "gif":
      bytes = toTransferable(encodeGif(data.data, data.width, data.height));
      mime = "image/gif";
      break;
    case "bmp":
      bytes = toTransferable(encodeBmp(data.data, data.width, data.height, { alpha: true }));
      mime = "image/bmp";
      break;
    default:
      throw new PipelineError("Formato de salida no soportado");
  }

  return { data: bytes, width: data.width, height: data.height, mime, bytes: bytes.byteLength };
}

// ────────────────────────────────────────────────────────────────────────────
// Pipeline
// ────────────────────────────────────────────────────────────────────────────

async function runPipeline(
  recipe: EditRecipe,
  sourceBytes: ArrayBuffer,
  cancel: CancelToken,
  onProgress: ProgressCallback,
): Promise<ImageJobResult> {
  const sorted = sortOps(recipe.ops);
  const phases: PipelinePhase[] = ["decode", ...sorted.map((op) => op.type), "encode"];
  const total = phases.length;

  report(onProgress, 0, "decode");
  await checkCancel(cancel);

  let data = await decode(sourceBytes, recipe.source.type);
  data = await applyOrientation(data, recipe.source.exifOrientation);
  report(onProgress, 1 / total, "decode");

  let phaseIndex = 1;
  for (const op of sorted) {
    await checkCancel(cancel);
    data = await applyOp(data, op, cancel);
    phaseIndex += 1;
    report(onProgress, phaseIndex / total, op.type);
  }

  await checkCancel(cancel);
  report(onProgress, (total - 1) / total, "encode");
  const result = await encode(data, recipe.output);
  await report(onProgress, 1, "encode");
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// API expuesta vía Comlink
// ────────────────────────────────────────────────────────────────────────────

let failNextJob = false;

const api: ImageWorkerApi = {
  async runJob(recipe, sourceBytes, cancel, onProgress) {
    if (failNextJob) {
      failNextJob = false;
      throw new PipelineError("Fallo inyectado para el test de reintento");
    }
    const result = await runPipeline(recipe, sourceBytes, cancel, onProgress);
    return Comlink.transfer(result, [result.data]);
  },
  _failNextJob() {
    failNextJob = true;
  },
  _crash() {
    // `self.close()` no dispara `onerror` en el hilo principal; una excepción no
    // capturada sí termina el worker y dispara `onerror`, que es lo que el pool
    // observa para reponerlo. Se lanza fuera del RPC para que no la atrape Comlink.
    setTimeout(() => {
      throw new Error("Crash simulado del worker");
    }, 0);
  },
};

Comlink.expose(api);
