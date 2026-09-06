/**
 * E2E §8.3 recorrido 4 — lote de 20 imágenes → ZIP. El ZIP se abre en el test con
 * fflate y se comprueban 20 entradas, nombres sin colisión y cada entrada con su
 * firma PNG.
 */

import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";
import { fixtureBuffer, upload } from "./image-ui";

test.use({ acceptDownloads: true });

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

test("lote de 20 imágenes → ZIP con 20 entradas sin colisión", async ({ page }) => {
  test.setTimeout(120_000);

  // Salida PNG (códec nativo, sin WASM): hace el lote rápido y determinista.
  await page.addInitScript(() => {
    localStorage.setItem(
      "tolva:preferences:v1",
      JSON.stringify({ version: 1, outputFormat: "png", quality: 80, stripMetadata: true }),
    );
  });
  await page.goto("/");

  const buf = fixtureBuffer("checkerboard.png");
  const files = [
    ...Array.from({ length: 19 }, (_, i) => ({
      name: `img-${String(i + 1).padStart(2, "0")}.png`,
      mimeType: "image/png",
      buffer: buf,
    })),
    // Mismo nombre base que `img-01.png` pero con otra extensión: al convertir a
    // PNG, el nombre de salida colisiona y el ZIP debe deduplicarlo.
    { name: "img-01.jpg", mimeType: "image/png", buffer: buf },
  ];
  await upload(page, files);

  await page.getByRole("button", { name: "Convertir todo" }).click();
  await expect(page.getByText("Listo", { exact: true })).toHaveCount(20);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Descargar ZIP" }).click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();

  const entries = unzipSync(new Uint8Array(readFileSync(path!)));
  const names = Object.keys(entries);
  expect(names).toHaveLength(20);
  expect(new Set(names).size).toBe(20); // sin colisión de nombres

  for (const name of names) {
    const bytes = entries[name];
    expect([bytes[0], bytes[1], bytes[2], bytes[3]], name).toEqual(PNG_SIGNATURE);
  }
});
