/**
 * E2E §8.3 recorrido 9 — presupuesto de carga diferida: cero `.wasm` antes del
 * primer fichero, y al pedir AVIF se carga exactamente el módulo AVIF y ninguno
 * más (ni jxl, ni webp, ni resize).
 */

import { expect, test } from "@playwright/test";
import { convert, fixture, makeRecipe, openHarness } from "./image-harness";

test("cero .wasm al cargar la app, antes del primer fichero", async ({ page }) => {
  const wasm: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes(".wasm")) wasm.push(req.url());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(wasm).toHaveLength(0);
});

test("pedir AVIF carga exactamente el módulo AVIF y ninguno más", async ({ page }) => {
  const wasm: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes(".wasm")) wasm.push(req.url());
  });
  await openHarness(page);

  const res = await convert(
    page,
    makeRecipe({ format: "avif", type: "image/png", width: 640, height: 360 }),
    fixture("gradient.png"),
  );
  expect(res.detected).toBe("avif");
  expect(wasm.length).toBeGreaterThan(0);

  // Exactamente el códec AVIF y ninguno más (ni jxl, ni webp, ni resize).
  expect(wasm.every((url) => url.includes("/codecs/avif/"))).toBe(true);
});
