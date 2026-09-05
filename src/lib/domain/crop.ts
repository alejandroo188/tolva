/**
 * Recorte: rectángulo fijado dentro de los límites, recorte con proporción
 * bloqueada al arrastrar cada asa, y bounding box de un rectángulo rotado (§8.1).
 */

import type { Dimensions, Point, Ratio, Rect } from "./types";

/** Las ocho asas de un rectángulo de recorte (4 esquinas + 4 bordes). */
export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/** Las cuatro asas de esquina. */
type CornerHandle = "nw" | "ne" | "sw" | "se";

function isCornerHandle(handle: Handle): handle is CornerHandle {
  return handle === "nw" || handle === "ne" || handle === "sw" || handle === "se";
}

function isValidRatio(ratio: Ratio): boolean {
  return Number.isFinite(ratio.w) && Number.isFinite(ratio.h) && ratio.w > 0 && ratio.h > 0;
}

/** Redondea a entero y recorta a `[min, max]` (asume `min ≤ max`). */
function clamp(value: number, min: number, max: number): number {
  const rounded = Math.round(value);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

/**
 * Fija un rectángulo dentro de `bounds`, redondeando a enteros y asegurando
 * al menos 1×1. Nunca se sale de los límites.
 */
export function clampRect(rect: Rect, bounds: Dimensions): Rect {
  if (
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  const width = clamp(rect.width, 1, bounds.width);
  const height = clamp(rect.height, 1, bounds.height);
  const x = clamp(rect.x, 0, bounds.width - width);
  const y = clamp(rect.y, 0, bounds.height - height);
  return { x, y, width, height };
}

/**
 * Rectángulo centrado de mayor tamaño con la proporción dada que cabe en
 * `bounds`. Es la base de los presets de redes (avatar, historia, post, …).
 */
export function centeredRectForRatio(bounds: Dimensions, ratio: Ratio): Rect {
  if (!isValidRatio(ratio) || bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  const scale = Math.min(bounds.width / ratio.w, bounds.height / ratio.h);
  const width = Math.max(1, Math.floor(scale * ratio.w));
  const height = Math.max(1, Math.floor(scale * ratio.h));
  const x = Math.floor((bounds.width - width) / 2);
  const y = Math.floor((bounds.height - height) / 2);
  return { x, y, width, height };
}

/** Esquina opuesta a una asa de esquina (ancla fija al arrastrar). */
function oppositeCorner(rect: Rect, handle: CornerHandle): Point {
  switch (handle) {
    case "nw":
      return { x: rect.x + rect.width, y: rect.y + rect.height };
    case "ne":
      return { x: rect.x, y: rect.y + rect.height };
    case "sw":
      return { x: rect.x + rect.width, y: rect.y };
    case "se":
      return { x: rect.x, y: rect.y };
  }
}

/**
 * Redimensiona `rect` manteniendo la proporción `ratio` al arrastrar la asa
 * `handle` hasta `pointer`, con `bounds` como límite. El punto/arista opuesto a
 * la asa permanece fijo. Devuelve un rectángulo entero, ≥ 1×1 y dentro de límites.
 */
export function resizeWithLockedRatio(
  rect: Rect,
  handle: Handle,
  pointer: Point,
  ratio: Ratio,
  bounds: Dimensions,
): Rect {
  if (!isValidRatio(ratio)) {
    return clampRect(rect, bounds);
  }

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  let x: number;
  let y: number;
  let width: number;
  let height: number;

  if (isCornerHandle(handle)) {
    const anchor = oppositeCorner(rect, handle);
    const dx = pointer.x - anchor.x;
    const dy = pointer.y - anchor.y;
    // La dimensión dominante manda; la otra se deriva de la proporción.
    if (Math.abs(dx) / ratio.w >= Math.abs(dy) / ratio.h) {
      width = Math.abs(dx);
      height = (width * ratio.h) / ratio.w;
    } else {
      height = Math.abs(dy);
      width = (height * ratio.w) / ratio.h;
    }
    x = dx >= 0 ? anchor.x : anchor.x - width;
    y = dy >= 0 ? anchor.y : anchor.y - height;
  } else if (handle === "n" || handle === "s") {
    const anchorY = handle === "n" ? rect.y + rect.height : rect.y;
    height = Math.abs(pointer.y - anchorY);
    width = (height * ratio.w) / ratio.h;
    y = handle === "n" ? Math.min(pointer.y, anchorY) : anchorY;
    x = centerX - width / 2;
  } else {
    // "e" | "w"
    const anchorX = handle === "e" ? rect.x : rect.x + rect.width;
    width = Math.abs(pointer.x - anchorX);
    height = (width * ratio.h) / ratio.w;
    x = handle === "e" ? Math.min(pointer.x, anchorX) : anchorX - width;
    y = centerY - height / 2;
  }

  return clampRect({ x, y, width, height }, bounds);
}

/**
 * Bounding box (eje-alineado) de un rectángulo tras rotarlo `degrees` (90/180/270)
 * alrededor de su centro. Para 180° es el mismo rectángulo; para 90°/270° se
 * intercambian ancho y alto manteniendo el centro.
 */
export function rotatedBoundingBox(rect: Rect, degrees: 90 | 180 | 270): Rect {
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  if (degrees === 180) {
    return { x: Math.round(rect.x), y: Math.round(rect.y), width, height };
  }
  // 90° y 270° producen el mismo bounding box (intercambio de ejes).
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  return {
    x: Math.round(centerX - height / 2),
    y: Math.round(centerY - width / 2),
    width: height,
    height: width,
  };
}
