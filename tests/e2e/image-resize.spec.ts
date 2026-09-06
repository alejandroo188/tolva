/**
 * E2E §8.3 recorrido 3 — redimensionado por píxeles y por porcentaje, con la
 * opción «no ampliar» respetada. El porcentaje se convierte a píxeles (la misma
 * operación `fill` que emite la UI) y se verifica contra el worker.
 */

import { expect, test } from "@playwright/test";
import { percentToPixels } from "../../src/lib/domain/aspect";
import { convert, fixture, makeRecipe, openHarness } from "./image-harness";

test("redimensiona por píxeles (fill) a las dimensiones exactas", async ({ page }) => {
  await openHarness(page);
  const res = await convert(
    page,
    makeRecipe({
      format: "png",
      type: "image/png",
      width: 640,
      height: 360,
      ops: [{ type: "resize", width: 320, height: 180, mode: "fill", upscale: false }],
    }),
    fixture("gradient.png"),
  );
  expect(res.width).toBe(320);
  expect(res.height).toBe(180);
});

test("redimensiona por porcentaje (50 % → 320×180)", async ({ page }) => {
  await openHarness(page);
  const w = percentToPixels(50, 640);
  const h = percentToPixels(50, 360);
  expect(w).toBe(320);
  expect(h).toBe(180);
  const res = await convert(
    page,
    makeRecipe({
      format: "png",
      type: "image/png",
      width: 640,
      height: 360,
      ops: [{ type: "resize", width: w, height: h, mode: "fill", upscale: false }],
    }),
    fixture("gradient.png"),
  );
  expect(res.width).toBe(320);
  expect(res.height).toBe(180);
});

test("«no ampliar» conserva el original con destino mayor (fit)", async ({ page }) => {
  await openHarness(page);
  const res = await convert(
    page,
    makeRecipe({
      format: "png",
      type: "image/png",
      width: 640,
      height: 360,
      ops: [{ type: "resize", width: 2000, height: 2000, mode: "fit", upscale: false }],
    }),
    fixture("gradient.png"),
  );
  expect(res.width).toBe(640);
  expect(res.height).toBe(360);
});

test("con ampliar activo escala hasta el destino (fit)", async ({ page }) => {
  await openHarness(page);
  const res = await convert(
    page,
    makeRecipe({
      format: "png",
      type: "image/png",
      width: 640,
      height: 360,
      ops: [{ type: "resize", width: 2000, height: 2000, mode: "fit", upscale: true }],
    }),
    fixture("gradient.png"),
  );
  expect(res.width).toBe(2000);
  expect(res.height).toBe(1125);
});
