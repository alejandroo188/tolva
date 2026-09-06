/**
 * Composición de recetas para la vista previa del editor.
 *
 * La vista previa es un `convert` del worker con una operación `resize` extra
 * (ajustar a un lado máximo) para acotar coste y memoria. El resultado se sirve
 * como `objectURL` para un `<img>`: la decodificación de píxeles sigue en el
 * worker, nunca en el hilo principal (§4.2).
 */

import type { EditRecipe, Op, OutputSpec } from "@/lib/domain/types";
import type { ImageJobResult } from "@/lib/workers/types";
import type { SourceItem } from "./intake";

/** Lado máximo de la vista previa (la salida real no se toca). */
export const PREVIEW_MAX_DIM = 1600;

/** El estado editable de una fuente: operaciones + salida (el resto sale del `SourceItem`). */
export interface EditorDraft {
  ops: Op[];
  output: OutputSpec;
}

/** Borrador neutro: sin operaciones y salida por defecto. */
export function emptyDraft(output: OutputSpec): EditorDraft {
  return { ops: [], output };
}

/** Construye la receta completa a partir de la fuente y su borrador. */
export function buildRecipe(source: SourceItem, draft: EditorDraft): EditRecipe {
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
    ops: draft.ops,
    output: draft.output,
  };
}

/**
 * Receta de vista previa: la receta original más un `resize` final (el worker
 * reordena al orden canónico) que la acota al lado máximo indicado.
 */
export function makePreviewRecipe(recipe: EditRecipe, maxDim = PREVIEW_MAX_DIM): EditRecipe {
  return {
    ...recipe,
    ops: [
      ...recipe.ops,
      { type: "resize", width: maxDim, height: maxDim, mode: "fit", upscale: false },
    ],
  };
}

/** Blob a partir del resultado del worker (para servir el `objectURL`). */
export function blobFromResult(result: ImageJobResult): Blob {
  return new Blob([result.data], { type: result.mime });
}

/** `objectURL` a partir del resultado del worker. */
export function objectUrlFromResult(result: ImageJobResult): string {
  return URL.createObjectURL(blobFromResult(result));
}
