/**
 * Utilidades compartidas por los specs E2E de la interfaz (§8.3). No es un spec
 * (Playwright sólo recolecta `*.spec.ts`). Aquí viven el selector estable de la
 * zona de arrastre y los cargadores de fixtures como `File`.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

const FIXTURES = resolve(process.cwd(), "tests/fixtures/images");

/** Input de ficheros de la zona de arrastre (acepta imágenes + SVG/TIFF). */
export const DROP_INPUT = 'input[type="file"][accept="image/*,.svg,.tif,.tiff"]';

/** Ruta absoluta de un fixture de imagen. */
export function fixturePath(name: string): string {
  return resolve(FIXTURES, name);
}

/** Bytes de un fixture de imagen como `Buffer`. */
export function fixtureBuffer(name: string): Buffer {
  return readFileSync(fixturePath(name));
}

/** Una carga de fichero: ruta, o contenido en memoria (`FilePayload`). */
export type UploadFiles =
  | string
  | string[]
  | { name: string; mimeType: string; buffer: Buffer }
  | Array<{ name: string; mimeType: string; buffer: Buffer }>;

/** Sube ficheros a la zona de arrastre (misma forma que `Page.setInputFiles`). */
export async function upload(page: Page, files: UploadFiles): Promise<void> {
  await page.setInputFiles(DROP_INPUT, files);
}
