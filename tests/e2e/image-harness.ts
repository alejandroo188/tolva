/**
 * Utilidades compartidas por los specs E2E del motor de imagen (§8.2).
 *
 * No es un spec: Playwright sólo recolecta `*.spec.ts`. Aquí viven el cargador de
 * fixtures (en base64, la única forma robusta de cruzar la frontera Node→navegador),
 * el constructor de recetas y el helper `convert` que invoca al harness
 * `window.__tolva` y devuelve un descriptor pequeño (no transfiere bytes grandes).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import type { EditRecipe, ExifOrientation, Op, OutputFormat } from "../../src/lib/domain/types";

const FIXTURES = resolve(process.cwd(), "tests/fixtures/images");

/** Lee un fixture como string base64 (se decodifica a `ArrayBuffer` en el navegador). */
export function fixture(name: string): string {
  return readFileSync(resolve(FIXTURES, name)).toString("base64");
}

export interface RecipeOptions {
  type?: string;
  width?: number;
  height?: number;
  orientation?: number;
  format: OutputFormat;
  quality?: number;
  stripMetadata?: boolean;
  ops?: Op[];
}

/** Construye una receta mínima y válida con valores por defecto neutros. */
export function makeRecipe(o: RecipeOptions): EditRecipe {
  return {
    source: {
      id: "t",
      name: "t",
      type: o.type ?? "image/png",
      bytes: 0,
      width: o.width ?? 1,
      height: o.height ?? 1,
      exifOrientation: (o.orientation ?? 1) as ExifOrientation,
    },
    ops: o.ops ?? [],
    output: {
      format: o.format,
      quality: o.quality ?? 80,
      stripMetadata: o.stripMetadata ?? true,
    },
  };
}

export interface ConvertResult {
  width: number;
  height: number;
  mime: string;
  bytes: number;
  /** Primeros 16 bytes de la salida, para la verificación por bytes mágicos. */
  magic: number[];
  /** Formato detectado por la propia `detectFormat` del navegador. */
  detected: string | null;
}

/** Abre `/dev/harness` y espera a que `window.__tolva` esté disponible. */
export async function openHarness(page: Page): Promise<void> {
  await page.goto("/dev/harness");
  await page.waitForFunction(
    () => (window as unknown as { __tolva?: unknown }).__tolva !== undefined,
  );
}

/** Convierte `sourceB64` con `recipe` en el navegador y devuelve un descriptor pequeño. */
export async function convert(
  page: Page,
  recipe: EditRecipe,
  sourceB64: string,
): Promise<ConvertResult> {
  return page.evaluate(
    async (arg) => {
      const { recipe, b64 } = arg as { recipe: EditRecipe; b64: string };
      const t = (
        window as unknown as {
          __tolva: {
            convert(
              recipe: unknown,
              bytes: ArrayBuffer,
            ): Promise<{
              data: ArrayBuffer;
              width: number;
              height: number;
              mime: string;
              bytes: number;
            }>;
            detectFormat(bytes: ArrayBuffer): string | null;
          };
        }
      ).__tolva;
      const bin = atob(b64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
      const res = await t.convert(recipe, u8.buffer as ArrayBuffer);
      const out = new Uint8Array(res.data);
      return {
        width: res.width,
        height: res.height,
        mime: res.mime,
        bytes: res.bytes,
        magic: Array.from(out.slice(0, 16)),
        detected: t.detectFormat(res.data),
      };
    },
    { recipe, b64: sourceB64 },
  );
}
