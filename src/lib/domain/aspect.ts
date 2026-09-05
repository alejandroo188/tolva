/**
 * Proporciones de aspecto: presets estándar, conversión porcentaje ↔ píxeles y
 * la distinción entre proporción bloqueada y libre (§8.1).
 */

import type { Dimensions, Ratio } from "./types";

/** Proporciones estándar que el editor ofrece con un clic. */
export const STANDARD_RATIOS: Record<string, Ratio> = {
  "1:1": { w: 1, h: 1 },
  "4:3": { w: 4, h: 3 },
  "3:2": { w: 3, h: 2 },
  "16:9": { w: 16, h: 9 },
  "9:16": { w: 9, h: 16 },
  "4:5": { w: 4, h: 5 },
};

/** Valor numérico `w / h` de una proporción. */
export function ratioValue(ratio: Ratio): number {
  if (!isValidRatio(ratio)) return 0;
  return ratio.w / ratio.h;
}

function isValidRatio(ratio: Ratio): boolean {
  return Number.isFinite(ratio.w) && Number.isFinite(ratio.h) && ratio.w > 0 && ratio.h > 0;
}

/** Proporción `w / h` de un tamaño (0 si la altura es nula). */
export function ratioOf(dimensions: Dimensions): number {
  if (dimensions.height === 0) return 0;
  return dimensions.width / dimensions.height;
}

/** Convierte un porcentaje (0–100) a píxeles sobre una dimensión de referencia. */
export function percentToPixels(percent: number, reference: number): number {
  if (!Number.isFinite(percent) || !Number.isFinite(reference) || reference <= 0) return 0;
  return Math.max(1, Math.round((reference * percent) / 100));
}

/** Convierte píxeles a porcentaje sobre una dimensión de referencia. */
export function pixelsToPercent(pixels: number, reference: number): number {
  if (!Number.isFinite(pixels) || !Number.isFinite(reference) || reference <= 0) return 0;
  return (pixels / reference) * 100;
}

/** Con proporción bloqueada, calcula la altura a partir del ancho (redondeada a ≥ 1). */
export function lockedHeight(width: number, ratio: Ratio): number {
  if (!isValidRatio(ratio) || !Number.isFinite(width) || width < 1) return 1;
  return Math.max(1, Math.round((width * ratio.h) / ratio.w));
}

/** Con proporción bloqueada, calcula el ancho a partir de la altura (redondeado a ≥ 1). */
export function lockedWidth(height: number, ratio: Ratio): number {
  if (!isValidRatio(ratio) || !Number.isFinite(height) || height < 1) return 1;
  return Math.max(1, Math.round((height * ratio.w) / ratio.h));
}

/**
 * Estado de proporción del editor: `free` (libre) o `locked` a un `ratio`.
 * Con `locked`, el segundo eje se deriva siempre del primero.
 */
export type RatioState = { locked: false } | { locked: true; ratio: Ratio };

/** Estado libre. */
export function freeRatio(): RatioState {
  return { locked: false };
}

/** Estado bloqueado a una proporción. */
export function lockRatio(ratio: Ratio): RatioState {
  return isValidRatio(ratio) ? { locked: true, ratio } : { locked: false };
}
