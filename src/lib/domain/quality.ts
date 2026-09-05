/**
 * Calidad: mapa calidad ↔ parámetros por códec y presets de vídeo →
 * resolución/bitrate/fps (§8.1).
 */

import type { OutputFormat } from "./types";
import type { VideoPreset } from "./presets";

/** Formatos de salida que Tolva produce (TIFF queda fuera: sólo lectura). */
export const OUTPUT_FORMATS: readonly OutputFormat[] = [
  "jpeg",
  "png",
  "webp",
  "avif",
  "jxl",
  "gif",
  "bmp",
];

/** ¿Es `value` un formato de salida válido? */
export function isOutputFormat(value: unknown): value is OutputFormat {
  return typeof value === "string" && (OUTPUT_FORMATS as readonly string[]).includes(value);
}

/** Formatos sin pérdida: la "calidad" no degrada píxeles. */
export function isLosslessFormat(format: OutputFormat): boolean {
  return format === "png" || format === "bmp";
}

/** Calidad normalizada a un entero en [0, 100]. Valor no numérico → 80. */
export function clampQuality(quality: number): number {
  if (!Number.isFinite(quality)) return 80;
  return Math.min(100, Math.max(0, Math.round(quality)));
}

/**
 * Calidad que se pasa al codificador, ya normalizada. Para JPEG/WebP/AVIF/JXL
 * se fuerza un mínimo de 1 (varios codificadores interpretan 0 como «por
 * defecto», no como «mínima»). Para PNG/BMP se devuelve la calidad normalizada
 * sin más (no afecta a los píxeles).
 */
export function encoderQuality(format: OutputFormat, quality: number): number {
  const q = clampQuality(quality);
  if (isLosslessFormat(format)) return q;
  return Math.max(1, q);
}

/**
 * Nivel de compresión PNG (0–9) derivado de la "calidad": calidad 100 → nivel 9
 * (mejor compresión), calidad 0 → nivel 0 (rápido, más grande). Determinista y
 * documentado; PNG es sin pérdida, así que aquí "calidad" significa esfuerzo.
 */
export function pngCompressionLevel(quality: number): number {
  const q = clampQuality(quality);
  return Math.round((q / 100) * 9);
}

/** Parámetros concretos de codificación de vídeo para un preset. */
export interface VideoEncoderParams {
  width: number;
  height: number;
  fps: number;
  videoBitrate: number;
  audioBitrate: number;
}

/**
 * Traduce un preset de vídeo a parámetros de codificación (resolución, fps y
 * bitrates), redondeados y saneados a valores positivos.
 */
export function videoParamsForPreset(preset: VideoPreset): VideoEncoderParams {
  return {
    width: Math.max(1, Math.round(preset.width)),
    height: Math.max(1, Math.round(preset.height)),
    fps: Math.max(1, Math.round(preset.fps)),
    videoBitrate: Math.max(1, Math.round(preset.videoBitrate)),
    audioBitrate: Math.max(1, Math.round(preset.audioBitrate)),
  };
}

/**
 * Escala un bitrate según la calidad (0–100): 100 → bitrate íntegro, 0 → mínimo.
 * Devuelve un entero ≥ 1.
 */
export function scaleBitrateForQuality(bitrate: number, quality: number): number {
  const q = clampQuality(quality);
  if (!Number.isFinite(bitrate) || bitrate <= 0) return 1;
  return Math.max(1, Math.round((bitrate * q) / 100));
}
