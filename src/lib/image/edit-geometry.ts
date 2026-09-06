/**
 * Geometría del editor de imagen: afinidades 2D puras para componer
 * crop → rotate → straighten → flip en el mismo orden que el worker (§4.3).
 *
 * Puro: sin DOM. El worker aplica las mismas operaciones; aquí sólo se calcula
 * la transformación para dibujar la vista previa y el overlay de recorte, y
 * para convertir el recorte del espacio de pantalla al de la fuente.
 */

import type { Rect } from "@/lib/domain/types";

/** Afinidad 2D como `[a, b, c, d, e, f]` (orden de `setTransform`). */
export type Affine = [number, number, number, number, number, number];

export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

/** Aplica la afinidad a un punto: `x' = a·x + c·y + e`, `y' = b·x + d·y + f`. */
export function applyPoint(m: Affine, x: number, y: number): [number, number] {
  const [a, b, c, d, e, f] = m;
  return [a * x + c * y + e, b * x + d * y + f];
}

/** Multiplica `a · b`: primero se aplica `b`, luego `a`. */
export function multiply(a: Affine, b: Affine): Affine {
  const [a1, b1, c1, d1, e1, f1] = a;
  const [a2, b2, c2, d2, e2, f2] = b;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

/** Traslación. */
export function translate(tx: number, ty: number): Affine {
  return [1, 0, 0, 1, tx, ty];
}

/** Rotación en grados (sentido horario, como `ctx.rotate`). */
export function rotateDeg(degrees: number): Affine {
  const r = (degrees * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
}

/** Escalado. */
export function scale(sx: number, sy: number): Affine {
  return [sx, 0, 0, sy, 0, 0];
}

/** Inversa de una afinidad no singular (degradación a identidad si es singular). */
export function invert(m: Affine): Affine {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) return IDENTITY;
  const ia = d / det;
  const ib = -b / det;
  const ic = -c / det;
  const id = a / det;
  const ie = -(ia * e + ic * f);
  const iff = -(ib * e + id * f);
  return [ia, ib, ic, id, ie, iff];
}

export interface EditTransformParams {
  /** Recorte en coordenadas de la fuente (orientada). */
  crop: Rect;
  /** Rotación ortogonal. */
  rotation: 0 | 90 | 180 | 270;
  /** Enderezado libre, en grados. */
  straighten: number;
  flipH: boolean;
  flipV: boolean;
}

export interface EditTransform {
  /** Fuente → salida (píxeles). */
  matrix: Affine;
  /** Dimensiones de salida (bounding box del recorte transformado). */
  outW: number;
  outH: number;
}

/**
 * Compone crop → rotate → straighten → flip en el mismo orden que el worker.
 * La afinidad resultante mapea coordenadas de la fuente a píxeles de salida.
 */
export function computeEditTransform(p: EditTransformParams): EditTransform {
  const cw = p.crop.width;
  const ch = p.crop.height;

  // Crop: traslada el origen al recorte.
  let m = translate(-p.crop.x, -p.crop.y);

  // Rotación ortogonal alrededor del centro del recorte.
  const rw = p.rotation === 90 || p.rotation === 270 ? ch : cw;
  const rh = p.rotation === 90 || p.rotation === 270 ? cw : ch;
  if (p.rotation !== 0) {
    const rot = multiply(
      multiply(translate(rw / 2, rh / 2), rotateDeg(p.rotation)),
      translate(-cw / 2, -ch / 2),
    );
    m = multiply(rot, m);
  }

  // Enderezado libre alrededor del centro de la imagen ya rotada (expande el bbox).
  const s = (p.straighten * Math.PI) / 180;
  const cos = Math.abs(Math.cos(s));
  const sin = Math.abs(Math.sin(s));
  const sw = Math.max(1, Math.round(rw * cos + rh * sin));
  const sh = Math.max(1, Math.round(rw * sin + rh * cos));
  if (p.straighten !== 0) {
    const str = multiply(
      multiply(translate(sw / 2, sh / 2), rotateDeg(p.straighten)),
      translate(-rw / 2, -rh / 2),
    );
    m = multiply(str, m);
  }

  // Volteos (horizontal y/o vertical).
  if (p.flipH) {
    m = multiply(multiply(translate(sw, 0), scale(-1, 1)), m);
  }
  if (p.flipV) {
    m = multiply(multiply(translate(0, sh), scale(1, -1)), m);
  }

  return { matrix: m, outW: sw, outH: sh };
}

/** Las cuatro esquinas de un rectángulo, en orden (nw, ne, se, sw). */
export function rectCorners(rect: Rect): [number, number][] {
  const { x, y, width, height } = rect;
  return [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
}

/** Transforma las esquinas de un rectángulo con una afinidad. */
export function transformRect(rect: Rect, m: Affine): [number, number][] {
  return rectCorners(rect).map(([x, y]) => applyPoint(m, x, y));
}
