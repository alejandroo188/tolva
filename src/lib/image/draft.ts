/**
 * Lectura y escritura de operaciones sobre el borrador del editor.
 *
 * Cada tipo de operación aparece a lo sumo una vez (dos en el caso de los
 * volteos, uno por eje). Las funciones son puras: reciben un `Op[]` y devuelven
 * uno nuevo, sin mutar. El worker reordena al orden canónico (§4.3), pero aquí
 * se usa `sortOps` para que el estado sea predecible y comparable.
 */

import type {
  AdjustOp,
  CropOp,
  Op,
  Rect,
  ResizeOp,
  RotateOp,
  StraightenOp,
  WatermarkOp,
} from "@/lib/domain/types";
import { sortOps } from "@/lib/domain/recipe";

/** Rotación ortogonal admitida. */
export type Rotation = 0 | 90 | 180 | 270;

/** Ajustes neutros (sin cambio). */
export const DEFAULT_ADJUST: AdjustOp = {
  type: "adjust",
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  grayscale: false,
};

/** El recorte del borrador, o `null` si no hay (imagen completa). */
export function getCrop(ops: Op[]): Rect | null {
  const op = ops.find((o): o is CropOp => o.type === "crop");
  return op ? { x: op.x, y: op.y, width: op.width, height: op.height } : null;
}

/** La rotación ortogonal del borrador (0 = ninguna). */
export function getRotation(ops: Op[]): Rotation {
  const op = ops.find((o): o is RotateOp => o.type === "rotate");
  return op?.degrees ?? 0;
}

/** El enderezado libre en grados (0 = ninguno). */
export function getStraighten(ops: Op[]): number {
  const op = ops.find((o): o is StraightenOp => o.type === "straighten");
  return op?.degrees ?? 0;
}

/** El redimensionado, o `null` si no hay (tamaño original). */
export function getResize(ops: Op[]): ResizeOp | null {
  const op = ops.find((o): o is ResizeOp => o.type === "resize");
  return op ? { ...op } : null;
}

/** Sustituye el redimensionado. `null` lo elimina (tamaño original). */
export function setResize(ops: Op[], resize: ResizeOp | null): Op[] {
  const rest = ops.filter((o) => o.type !== "resize");
  if (!resize) return sortOps(rest);
  return sortOps([...rest, resize]);
}

/** Los volteos activos del borrador. */
export function getFlips(ops: Op[]): { horizontal: boolean; vertical: boolean } {
  let horizontal = false;
  let vertical = false;
  for (const op of ops) {
    if (op.type === "flip") {
      if (op.axis === "horizontal") horizontal = true;
      else vertical = true;
    }
  }
  return { horizontal, vertical };
}

/** Los ajustes de color (neutros si no hay). */
export function getAdjust(ops: Op[]): AdjustOp {
  const op = ops.find((o): o is AdjustOp => o.type === "adjust");
  return op ? { ...op } : { ...DEFAULT_ADJUST };
}

/** La marca de agua, o `null` si no hay. */
export function getWatermark(ops: Op[]): WatermarkOp | null {
  const op = ops.find((o): o is WatermarkOp => o.type === "watermark");
  return op ? { ...op } : null;
}

/** ¿Tiene el borrador alguna operación (para el comparador y «restablecer»)? */
export function hasOps(ops: Op[]): boolean {
  return ops.length > 0;
}

/** Sustituye el recorte. `null` elimina la operación (imagen completa). */
export function setCrop(ops: Op[], rect: Rect | null): Op[] {
  const rest = ops.filter((o) => o.type !== "crop");
  if (!rect) return sortOps(rest);
  return sortOps([
    ...rest,
    { type: "crop", x: rect.x, y: rect.y, width: rect.width, height: rect.height },
  ]);
}

/** Sustituye la rotación ortogonal (0 la elimina). */
export function setRotation(ops: Op[], degrees: Rotation): Op[] {
  const rest = ops.filter((o) => o.type !== "rotate");
  if (degrees === 0) return sortOps(rest);
  return sortOps([...rest, { type: "rotate", degrees }]);
}

/** Sustituye el enderezado libre (0 lo elimina), redondeado a 1 decimal. */
export function setStraighten(ops: Op[], degrees: number): Op[] {
  const rest = ops.filter((o) => o.type !== "straighten");
  const rounded = Math.round(degrees * 10) / 10;
  if (rounded === 0) return sortOps(rest);
  return sortOps([...rest, { type: "straighten", degrees: rounded }]);
}

/** Sustituye los volteos (horizontal y vertical). */
export function setFlips(ops: Op[], horizontal: boolean, vertical: boolean): Op[] {
  const rest = ops.filter((o) => o.type !== "flip");
  const out: Op[] = [...rest];
  if (horizontal) out.push({ type: "flip", axis: "horizontal" });
  if (vertical) out.push({ type: "flip", axis: "vertical" });
  return sortOps(out);
}

/** Alterna un eje de volteo conservando el otro. */
export function toggleFlip(ops: Op[], axis: "horizontal" | "vertical"): Op[] {
  const flips = getFlips(ops);
  return axis === "horizontal"
    ? setFlips(ops, !flips.horizontal, flips.vertical)
    : setFlips(ops, flips.horizontal, !flips.vertical);
}

/** Sustituye los ajustes. Neutro ⇒ elimina la operación. */
export function setAdjust(ops: Op[], patch: Partial<Omit<AdjustOp, "type">>): Op[] {
  const current = getAdjust(ops);
  const next: AdjustOp = { ...current, ...patch, type: "adjust" };
  const neutral =
    next.brightness === 0 &&
    next.contrast === 0 &&
    next.saturation === 0 &&
    next.temperature === 0 &&
    next.grayscale === false;
  const rest = ops.filter((o) => o.type !== "adjust");
  if (neutral) return sortOps(rest);
  return sortOps([...rest, next]);
}

/** Sustituye la marca de agua. `null` la elimina. */
export function setWatermark(ops: Op[], watermark: WatermarkOp | null): Op[] {
  const rest = ops.filter((o) => o.type !== "watermark");
  if (!watermark) return sortOps(rest);
  return sortOps([...rest, watermark]);
}
