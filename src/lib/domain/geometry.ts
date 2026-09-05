/**
 * Geometría de redimensionado: `fit`/`contain`/`cover`.
 *
 * Puro: números enteros, sin deriva acumulada, mínimo 1 px, y la opción de no
 * ampliar por encima del original. Todo testeable en Node (§8.1).
 */

import type { Dimensions } from "./types";

/** Resultado de un escalado: dimensiones enteras ≥ 1 y el factor aplicado. */
export interface ScaleResult extends Dimensions {
  scale: number;
}

export interface ScaleOptions {
  /**
   * Si `false` (por defecto), nunca amplía por encima del tamaño original:
   * cuando el factor calculado supera 1 se recorta a 1.
   */
  upscale?: boolean;
}

const MIN_PIXEL = 1;

/** Recorta un valor a un número de píxeles válido (entero, ≥ 1, finito). */
function clampPixel(value: number): number {
  if (!Number.isFinite(value) || value < MIN_PIXEL) return MIN_PIXEL;
  return Math.floor(value);
}

function hasInvalidDimensions(a: Dimensions, b: Dimensions): boolean {
  return a.width <= 0 || a.height <= 0 || b.width <= 0 || b.height <= 0;
}

/**
 * Escala `source` para que quepa *dentro* de `target` conservando la proporción.
 * Devuelve dimensiones enteras; el redondeo se hace una sola vez al final.
 */
function scaleToFit(
  source: Dimensions,
  target: Dimensions,
  options: ScaleOptions = {},
): ScaleResult {
  const upscale = options.upscale ?? false;
  if (hasInvalidDimensions(source, target)) {
    return { width: MIN_PIXEL, height: MIN_PIXEL, scale: 1 };
  }
  let scale = Math.min(target.width / source.width, target.height / source.height);
  if (!upscale && scale > 1) scale = 1;
  return {
    width: clampPixel(source.width * scale),
    height: clampPixel(source.height * scale),
    scale,
  };
}

/**
 * Escala `source` para *cubrir* `target` conservando la proporción (el resultado
 * puede exceder el objetivo; luego se recorta). Mismas garantías de enteros.
 */
function scaleToCover(
  source: Dimensions,
  target: Dimensions,
  options: ScaleOptions = {},
): ScaleResult {
  const upscale = options.upscale ?? false;
  if (hasInvalidDimensions(source, target)) {
    return { width: MIN_PIXEL, height: MIN_PIXEL, scale: 1 };
  }
  let scale = Math.max(target.width / source.width, target.height / source.height);
  if (!upscale && scale > 1) scale = 1;
  return {
    width: clampPixel(source.width * scale),
    height: clampPixel(source.height * scale),
    scale,
  };
}

/** Ajusta la imagen para que quepa dentro del objetivo (sin recortar). */
export function fit(source: Dimensions, target: Dimensions, options?: ScaleOptions): ScaleResult {
  return scaleToFit(source, target, options);
}

/** Sinónimo de `fit`: la imagen se contiene por completo dentro del objetivo. */
export function contain(
  source: Dimensions,
  target: Dimensions,
  options?: ScaleOptions,
): ScaleResult {
  return scaleToFit(source, target, options);
}

/** Ajusta la imagen para cubrir el objetivo (habrá que recortar). */
export function cover(source: Dimensions, target: Dimensions, options?: ScaleOptions): ScaleResult {
  return scaleToCover(source, target, options);
}
