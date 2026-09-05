/**
 * Redimensionado: elección de algoritmo según el factor de escala y cadena de
 * pasos para reducciones grandes (evitar alias al remuestrear de golpe) (§8.1).
 */

import type { Dimensions } from "./types";

/** Algoritmos de remuestreo disponibles en el pipeline. */
export type ResizeAlgorithm = "none" | "bilinear" | "lanczos3";

/**
 * Elige el algoritmo según el factor de escala:
 * - reducir → `lanczos3` (calidad),
 * - ampliar → `bilinear` (rápido, evita el coste de Lanczos en upscaling),
 * - 1:1 → `none`.
 */
export function chooseAlgorithm(scale: number): ResizeAlgorithm {
  if (!Number.isFinite(scale) || scale <= 0) return "none";
  if (scale > 1) return "bilinear";
  if (scale < 1) return "lanczos3";
  return "none";
}

/** Un paso intermedio del plan de reducción. */
export type ResizeStep = Dimensions;

/** Factor máximo de reducción por paso (evita alias al reducir mucho). */
const MAX_STEP_SCALE = 0.5;

/**
 * Planifica la reducción de `source` a `target` en pasos encadenados: si el
 * factor total es mayor que 2×, se reduce por mitades sucesivas y se remata con
 * el paso final exacto. Devuelve los tamaños intermedios (excluye el origen,
 * incluye el destino). Si no hay que reducir (destino ≥ origen en ambos ejes),
 * devuelve un único paso al destino.
 */
export function planReductionSteps(source: Dimensions, target: Dimensions): ResizeStep[] {
  if (source.width <= 0 || source.height <= 0 || target.width <= 0 || target.height <= 0) {
    return [];
  }

  const scaleX = target.width / source.width;
  const scaleY = target.height / source.height;
  const totalScale = Math.min(scaleX, scaleY);

  // Sin reducción o reducción suave: un único paso.
  if (totalScale >= MAX_STEP_SCALE) {
    return [{ width: target.width, height: target.height }];
  }

  const steps: ResizeStep[] = [];
  let width = source.width;
  let height = source.height;

  // Reducción por mitades hasta acercarse al objetivo.
  while (
    width / 2 >= target.width &&
    height / 2 >= target.height &&
    width / 2 > 0 &&
    height / 2 > 0
  ) {
    width = Math.max(1, Math.floor(width / 2));
    height = Math.max(1, Math.floor(height / 2));
    steps.push({ width, height });
  }

  // Paso final exacto (evita duplicar el destino si ya se alcanzó).
  const last = steps[steps.length - 1];
  if (!last || last.width !== target.width || last.height !== target.height) {
    steps.push({ width: target.width, height: target.height });
  }

  return steps;
}
