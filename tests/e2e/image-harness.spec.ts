/**
 * E2E del pool de workers y del presupuesto de carga diferida (§8.2, §8.6):
 * progreso monótono, concurrencia acotada al pool, reintento y recuperación
 * ante fallo/caída, y cero `.wasm` descargados hasta pedir el formato.
 */

import { expect, test } from "@playwright/test";
import { convert, fixture, makeRecipe, openHarness } from "./image-harness";

test("el progreso avanza de forma monótona de 0 a 1", async ({ page }) => {
  await openHarness(page);
  const recipe = makeRecipe({
    format: "jpeg",
    type: "image/png",
    width: 640,
    height: 360,
    ops: [
      { type: "resize", width: 320, height: 180, mode: "fill", upscale: false },
      { type: "adjust", brightness: 10, contrast: 0, saturation: 0 },
    ],
  });

  const progress = await page.evaluate(
    async ({ recipe, b64 }) => {
      const t = (
        window as unknown as {
          __tolva: {
            convert(
              recipe: unknown,
              bytes: ArrayBuffer,
              options: { onProgress(p: number): void },
            ): Promise<unknown>;
          };
        }
      ).__tolva;
      const bin = atob(b64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
      const seen: number[] = [];
      await t.convert(recipe, u8.buffer as ArrayBuffer, { onProgress: (p) => seen.push(p) });
      return seen;
    },
    { recipe, b64: fixture("gradient.png") },
  );

  expect(progress.length).toBeGreaterThanOrEqual(2);
  expect(progress[0]).toBe(0);
  expect(progress[progress.length - 1]).toBe(1);
  for (let i = 1; i < progress.length; i += 1) {
    expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1] - 1e-9);
  }
});

test("la concurrencia nunca supera el tamaño del pool", async ({ page }) => {
  await openHarness(page);
  const recipe = makeRecipe({
    format: "jpeg",
    type: "image/png",
    width: 640,
    height: 360,
    ops: [{ type: "resize", width: 320, height: 180, mode: "fill", upscale: false }],
  });

  const stats = await page.evaluate(
    async ({ recipe, b64 }) => {
      const t = (
        window as unknown as {
          __tolva: {
            convertBatch(
              recipes: unknown[],
              sources: ArrayBuffer[],
              poolSize: number,
            ): Promise<unknown[]>;
            poolStats(): { maxActive: number; completed: number };
          };
        }
      ).__tolva;
      const bin = atob(b64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
      const ab = u8.buffer as ArrayBuffer;
      const N = 8;
      const recipes = Array.from({ length: N }, () => recipe);
      const sources = Array.from({ length: N }, () => ab.slice(0));
      await t.convertBatch(recipes, sources, 2);
      return t.poolStats();
    },
    { recipe, b64: fixture("gradient.png") },
  );

  expect(stats.maxActive).toBeLessThanOrEqual(2);
  expect(stats.completed).toBe(8);
});

test("reintenta una vez y repone el worker tras un fallo inyectado", async ({ page }) => {
  await openHarness(page);
  const recipe = makeRecipe({ format: "jpeg", type: "image/png", width: 640, height: 360 });

  const result = await page.evaluate(
    async ({ recipe, b64 }) => {
      const t = (
        window as unknown as {
          __tolva: {
            failNextJob(): Promise<void>;
            convert(recipe: unknown, bytes: ArrayBuffer): Promise<{ data: ArrayBuffer }>;
            detectFormat(bytes: ArrayBuffer): string | null;
            poolStats(): { retried: number; respawned: number; completed: number; failed: number };
          };
        }
      ).__tolva;
      const bin = atob(b64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
      await t.failNextJob();
      const out = await t.convert(recipe, u8.buffer as ArrayBuffer);
      const stats = t.poolStats();
      return { detected: t.detectFormat(out.data), ...stats };
    },
    { recipe, b64: fixture("gradient.png") },
  );

  expect(result.detected).toBe("jpeg");
  expect(result.retried).toBeGreaterThanOrEqual(1);
  expect(result.respawned).toBeGreaterThanOrEqual(1);
  expect(result.failed).toBe(0);
});

test("se recupera del cierre abrupto de un worker", async ({ page }) => {
  await openHarness(page);
  const recipe = makeRecipe({ format: "jpeg", type: "image/png", width: 640, height: 360 });

  const result = await page.evaluate(
    async ({ recipe, b64 }) => {
      const t = (
        window as unknown as {
          __tolva: {
            crashWorker(): void;
            convert(recipe: unknown, bytes: ArrayBuffer): Promise<{ data: ArrayBuffer }>;
            detectFormat(bytes: ArrayBuffer): string | null;
            poolStats(): { respawned: number; completed: number };
          };
        }
      ).__tolva;
      const bin = atob(b64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
      t.crashWorker();
      // Deja que el mensaje `_crash` llegue y el worker se cierre.
      await new Promise((r) => setTimeout(r, 100));
      const out = await t.convert(recipe, u8.buffer as ArrayBuffer);
      const stats = t.poolStats();
      return { detected: t.detectFormat(out.data), ...stats };
    },
    { recipe, b64: fixture("gradient.png") },
  );

  expect(result.detected).toBe("jpeg");
  expect(result.respawned).toBeGreaterThanOrEqual(1);
  expect(result.completed).toBeGreaterThanOrEqual(1);
});

test("no descarga .wasm hasta que se pide el formato correspondiente", async ({ page }) => {
  const wasm: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes(".wasm")) wasm.push(req.url());
  });
  await openHarness(page);

  // JPEG y PNG se codifican con códecs nativos (sin WASM).
  const jpeg = await convert(
    page,
    makeRecipe({ format: "jpeg", type: "image/png", width: 640, height: 360 }),
    fixture("gradient.png"),
  );
  const png = await convert(
    page,
    makeRecipe({ format: "png", type: "image/png", width: 640, height: 360 }),
    fixture("gradient.png"),
  );
  expect(jpeg.detected).toBe("jpeg");
  expect(png.detected).toBe("png");
  expect(wasm).toHaveLength(0);

  // AVIF carga su códec WASM de forma diferida.
  const avif = await convert(
    page,
    makeRecipe({ format: "avif", type: "image/png", width: 640, height: 360 }),
    fixture("gradient.png"),
  );
  expect(avif.detected).toBe("avif");
  expect(wasm.some((url) => url.includes("/codecs/avif/"))).toBe(true);
});
