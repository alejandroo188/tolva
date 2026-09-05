/**
 * La receta (`EditRecipe`): orden canónico de operaciones, serialización
 * estable y validación de recetas inválidas (§8.1).
 */

import type { EditRecipe, ExifOrientation, Op, ResizeMode, WatermarkPosition } from "./types";
import { isOutputFormat } from "./quality";

/** Orden canónico de operaciones (crop → rotate → flip → resize → adjust → watermark). */
export const OP_ORDER = ["crop", "rotate", "flip", "resize", "adjust", "watermark"] as const;
export type OpType = (typeof OP_ORDER)[number];

/** Tipo de una operación (discriminante `op.type`). */
export function opType(op: Op): OpType {
  return op.type;
}

/**
 * Reordena las operaciones al orden canónico. Es estable: dentro del mismo tipo
 * conserva el orden de entrada.
 */
export function sortOps(ops: Op[]): Op[] {
  const rank = new Map<string, number>();
  OP_ORDER.forEach((type, index) => rank.set(type, index));
  return [...ops].sort(
    (a, b) => (rank.get(a.type) ?? OP_ORDER.length) - (rank.get(b.type) ?? OP_ORDER.length),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isExifOrientation(value: unknown): value is ExifOrientation {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 8;
}

function isResizeMode(value: unknown): value is ResizeMode {
  return value === "fit" || value === "contain" || value === "cover" || value === "fill";
}

function isWatermarkPosition(value: unknown): value is WatermarkPosition {
  return (
    value === "nw" ||
    value === "n" ||
    value === "ne" ||
    value === "w" ||
    value === "center" ||
    value === "e" ||
    value === "sw" ||
    value === "s" ||
    value === "se"
  );
}

function isPercent(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -100 && value <= 100;
}

function isUnit(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function validateOp(op: unknown, index: number): Op {
  if (!isRecord(op) || typeof op.type !== "string") {
    throw new Error(`op #${index}: debe ser un objeto con "type"`);
  }
  switch (op.type) {
    case "crop":
      if (
        !isNonNegativeInteger(op.x) ||
        !isNonNegativeInteger(op.y) ||
        !isPositiveInteger(op.width) ||
        !isPositiveInteger(op.height)
      ) {
        throw new Error(`op #${index} (crop): x/y ≥ 0 y width/height > 0 enteros`);
      }
      return { type: "crop", x: op.x, y: op.y, width: op.width, height: op.height };
    case "rotate":
      if (op.degrees !== 90 && op.degrees !== 180 && op.degrees !== 270) {
        throw new Error(`op #${index} (rotate): degrees debe ser 90, 180 o 270`);
      }
      return { type: "rotate", degrees: op.degrees };
    case "flip":
      if (op.axis !== "horizontal" && op.axis !== "vertical") {
        throw new Error(`op #${index} (flip): axis debe ser "horizontal" o "vertical"`);
      }
      return { type: "flip", axis: op.axis };
    case "resize":
      if (
        !isPositiveInteger(op.width) ||
        !isPositiveInteger(op.height) ||
        !isResizeMode(op.mode) ||
        typeof op.upscale !== "boolean"
      ) {
        throw new Error(`op #${index} (resize): width/height > 0, mode y upscale válidos`);
      }
      return {
        type: "resize",
        width: op.width,
        height: op.height,
        mode: op.mode,
        upscale: op.upscale,
      };
    case "adjust":
      if (!isPercent(op.brightness) || !isPercent(op.contrast) || !isPercent(op.saturation)) {
        throw new Error(`op #${index} (adjust): brightness/contrast/saturation en -100..100`);
      }
      return {
        type: "adjust",
        brightness: op.brightness,
        contrast: op.contrast,
        saturation: op.saturation,
      };
    case "watermark":
      if (typeof op.text !== "string" || !isUnit(op.opacity) || !isWatermarkPosition(op.position)) {
        throw new Error(`op #${index} (watermark): text, opacity (0..1) y position válidos`);
      }
      return { type: "watermark", text: op.text, opacity: op.opacity, position: op.position };
    default:
      throw new Error(`op #${index}: tipo desconocido "${String(op.type)}"`);
  }
}

/**
 * Valida una receta y devuelve la versión tipada. Lanza `Error` con un mensaje
 * concreto ante cualquier campo inválido. No muta ni reordena nada.
 */
export function validateRecipe(input: unknown): EditRecipe {
  if (!isRecord(input)) throw new Error("La receta debe ser un objeto");

  const source = input.source;
  if (!isRecord(source)) throw new Error('La receta debe tener "source"');
  if (typeof source.id !== "string" || source.id.length === 0)
    throw new Error("source.id debe ser un string no vacío");
  if (typeof source.name !== "string") throw new Error("source.name debe ser un string");
  if (typeof source.type !== "string") throw new Error("source.type debe ser un string");
  if (!isNonNegativeInteger(source.bytes)) throw new Error("source.bytes debe ser un entero ≥ 0");
  if (!isPositiveInteger(source.width) || !isPositiveInteger(source.height))
    throw new Error("source.width y source.height deben ser enteros > 0");
  if (!isExifOrientation(source.exifOrientation))
    throw new Error("source.exifOrientation debe ser un entero 1..8");

  if (!Array.isArray(input.ops)) throw new Error('La receta debe tener "ops" (array)');
  const ops = input.ops.map((op, index) => validateOp(op, index));

  const output = input.output;
  if (!isRecord(output)) throw new Error('La receta debe tener "output"');
  if (!isOutputFormat(output.format))
    throw new Error("output.format no es un formato de salida válido");
  if (!isFiniteNumber(output.quality) || output.quality < 0 || output.quality > 100) {
    throw new Error("output.quality debe estar en 0..100");
  }
  if (typeof output.stripMetadata !== "boolean")
    throw new Error("output.stripMetadata debe ser booleano");
  if (output.maxBytes !== undefined && !isNonNegativeInteger(output.maxBytes)) {
    throw new Error("output.maxBytes debe ser un entero ≥ 0");
  }

  return {
    source: {
      id: source.id,
      name: source.name,
      type: source.type,
      bytes: source.bytes,
      width: source.width,
      height: source.height,
      exifOrientation: source.exifOrientation,
    },
    ops,
    output: {
      format: output.format,
      quality: output.quality,
      stripMetadata: output.stripMetadata,
      ...(output.maxBytes !== undefined ? { maxBytes: output.maxBytes } : {}),
    },
  };
}

/** ¿Es `input` una receta válida? (no lanza). */
export function isEditRecipe(input: unknown): input is EditRecipe {
  try {
    validateRecipe(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Serialización estable: claves ordenadas alfabéticamente de forma recursiva,
 * de modo que dos recetas equivalentes producen la misma cadena JSON
 * independientemente del orden de las claves en el objeto de entrada.
 */
export function serializeRecipe(recipe: EditRecipe): string {
  const sorted = sortOps(recipe.ops);
  return stableStringify({ source: recipe.source, ops: sorted, output: recipe.output });
}

/** Deserializa una receta, validándola. Lanza un error legible si el JSON es inválido. */
export function deserializeRecipe(json: string): EditRecipe {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("La receta no es JSON válido");
  }
  return validateRecipe(parsed);
}

/** `JSON.stringify` con las claves de objeto ordenadas (recursivo y estable). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (isRecord(val)) {
      const ordered: Record<string, unknown> = {};
      for (const k of Object.keys(val).sort()) ordered[k] = val[k];
      return ordered;
    }
    return val;
  });
}
