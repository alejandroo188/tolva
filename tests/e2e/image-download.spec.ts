/**
 * E2E §8.3 recorrido 1 — conversión de imagen **por la interfaz**: subir →
 * elegir formato → convertir → descargar → firma de bytes correcta y extensión
 * coherente.
 *
 * `image-formats.spec.ts` cubre lo mismo contra el motor (harness) y
 * `image-batch.spec.ts` contra las entradas del ZIP; esto cierra el recorrido
 * completo del usuario, con su descarga real.
 */

import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import type { OutputFormat } from "../../src/lib/domain/types";
import { fixturePath, upload } from "./image-ui";

const FORMATS: Array<{ format: OutputFormat; label: string; ext: string; magic: number[] }> = [
  { format: "jpeg", label: "JPEG", ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  {
    format: "png",
    label: "PNG",
    ext: "png",
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { format: "webp", label: "WebP", ext: "webp", magic: [0x52, 0x49, 0x46, 0x46] },
  { format: "avif", label: "AVIF", ext: "avif", magic: [] },
  { format: "jxl", label: "JXL", ext: "jxl", magic: [] },
  { format: "gif", label: "GIF", ext: "gif", magic: [0x47, 0x49, 0x46, 0x38] },
  { format: "bmp", label: "BMP", ext: "bmp", magic: [0x42, 0x4d] },
];

for (const { format, label, ext, magic } of FORMATS) {
  test(`convertir a ${label} y descargar produce un fichero con su firma`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/");
    await upload(page, [fixturePath("gradient.png")]);
    await expect(page.getByRole("button", { name: "Recortar" })).toBeVisible();

    await page.getByRole("radio", { name: label, exact: true }).click();
    await page.getByRole("button", { name: "Convertir", exact: true }).click();
    await expect(page.getByText("Listo", { exact: true })).toHaveCount(1, { timeout: 45_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Descargar", exact: true }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${ext}$`));

    const path = await download.path();
    const bytes = [...readFileSync(path!).subarray(0, 16)];

    if (format === "avif") {
      // `…ftypavif` en el offset 4 (el tamaño de la caja va delante).
      expect(bytes.slice(4, 12)).toEqual([0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]);
    } else if (format === "jxl") {
      // Codestream desnudo (FF 0A) o contenedor ISOBMFF («JXL »).
      const naked = bytes[0] === 0xff && bytes[1] === 0x0a;
      const boxed =
        bytes.slice(0, 8).join() === [0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20].join();
      expect(naked || boxed).toBe(true);
    } else {
      expect(bytes.slice(0, magic.length)).toEqual(magic);
    }
  });
}
