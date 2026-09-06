/**
 * E2E de la ingesta `probe`: dimensiones orientadas decodificadas en el worker
 * (nunca en el hilo principal). Verifica que el SVG se rasteriza y que la
 * orientación EXIF 6 intercambia el ancho y el alto.
 */

import { expect, test } from "@playwright/test";
import { fixture, openHarness } from "./image-harness";

test("probe devuelve las dimensiones orientadas de un PNG", async ({ page }) => {
  await openHarness(page);
  const res = await page.evaluate(async (b64) => {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
    const t = (
      window as unknown as {
        __tolva: {
          probe(
            bytes: ArrayBuffer,
            mime: string,
            orientation: number,
          ): Promise<{ width: number; height: number }>;
        };
      }
    ).__tolva;
    return t.probe(u8.buffer as ArrayBuffer, "image/png", 1);
  }, fixture("gradient.png"));
  expect(res).toEqual({ width: 640, height: 360 });
});

test("probe aplica la orientación EXIF 6 (800×600 → 600×800)", async ({ page }) => {
  await openHarness(page);
  const res = await page.evaluate(async (b64) => {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
    const t = (
      window as unknown as {
        __tolva: {
          probe(
            bytes: ArrayBuffer,
            mime: string,
            orientation: number,
          ): Promise<{ width: number; height: number }>;
        };
      }
    ).__tolva;
    return t.probe(u8.buffer as ArrayBuffer, "image/jpeg", 6);
  }, fixture("exif.jpg"));
  expect(res).toEqual({ width: 600, height: 800 });
});

test("probe rasteriza el SVG y devuelve sus dimensiones", async ({ page }) => {
  await openHarness(page);
  const res = await page.evaluate(async (b64) => {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
    const t = (
      window as unknown as {
        __tolva: {
          probe(
            bytes: ArrayBuffer,
            mime: string,
            orientation: number,
          ): Promise<{ width: number; height: number }>;
        };
      }
    ).__tolva;
    return t.probe(u8.buffer as ArrayBuffer, "image/svg+xml", 1);
  }, fixture("sample.svg"));
  expect(res.width).toBeGreaterThan(0);
  expect(res.height).toBeGreaterThan(0);
});
