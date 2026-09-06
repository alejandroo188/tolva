/**
 * Empaquetado en ZIP para la descarga en lote (fflate, todo en el navegador).
 *
 * `level: 0` (sin comprimir) porque las imágenes ya van comprimidas por su
 * códec; comprimirlas otra vez sólo gastaría CPU sin ahorrar bytes.
 */

import { zipSync } from "fflate";

export interface ZipEntry {
  /** Nombre del fichero dentro del ZIP (ya sin colisiones). */
  name: string;
  data: Uint8Array;
}

/** Construye un ZIP a partir de entradas `{ nombre, bytes }`. */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const entry of entries) files[entry.name] = entry.data;
  return zipSync(files, { level: 0 });
}
