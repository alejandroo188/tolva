/**
 * E2E de las operaciones nuevas del Hito 4 (§8.3 recorrido 5 + editor):
 * enderezado libre (straighten), escala de grises, temperatura y marca de agua
 * de imagen. Verifican que el motor produce píxeles correctos, no sólo que no
 * lanza.
 */

import { expect, test } from "@playwright/test";
import { fixture, openHarness } from "./image-harness";

const RECIPE = {
  source: {
    id: "e",
    name: "e",
    type: "image/png",
    bytes: 0,
    width: 640,
    height: 360,
    exifOrientation: 1,
  },
  ops: [],
  output: { format: "png", quality: 80, stripMetadata: true },
};

test("straighten expande el lienzo y produce un PNG válido", async ({ page }) => {
  await openHarness(page);
  const res = await page.evaluate(
    async (src) => {
      const bin = atob(src.b64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
      const t = (
        window as unknown as {
          __tolva: {
            convert(
              r: unknown,
              b: ArrayBuffer,
            ): Promise<{ data: ArrayBuffer; width: number; height: number; mime: string }>;
          };
        }
      ).__tolva;
      const recipe = {
        ...(JSON.parse(src.recipeJson) as object),
        ops: [{ type: "straighten", degrees: 30 }],
      };
      const r = await t.convert(recipe, u8.buffer as ArrayBuffer);
      const out = new Uint8Array(r.data);
      return { width: r.width, height: r.height, magic: Array.from(out.slice(0, 8)) };
    },
    { b64: fixture("gradient.png"), recipeJson: JSON.stringify(RECIPE) },
  );

  // 30° sobre 640×360: el bounding box crece en ambos ejes.
  expect(res.width).toBeGreaterThan(640);
  expect(res.height).toBeGreaterThan(360);
  expect(res.magic).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});

test("la escala de grises iguala los tres canales", async ({ page }) => {
  await openHarness(page);
  const res = await page.evaluate(
    async (src) => {
      const bin = atob(src.b64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
      const t = (
        window as unknown as {
          __tolva: { convert(r: unknown, b: ArrayBuffer): Promise<{ data: ArrayBuffer }> };
        }
      ).__tolva;
      const recipe = {
        ...(JSON.parse(src.recipeJson) as object),
        ops: [
          {
            type: "adjust",
            brightness: 0,
            contrast: 0,
            saturation: 0,
            temperature: 0,
            grayscale: true,
          },
        ],
      };
      const r = await t.convert(recipe, u8.buffer as ArrayBuffer);
      const bitmap = await createImageBitmap(new Blob([r.data]));
      const c = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = c.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const d = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
      bitmap.close();
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] !== d[i + 1] || d[i + 1] !== d[i + 2]) return false;
      }
      return true;
    },
    { b64: fixture("color-chart.png"), recipeJson: JSON.stringify(RECIPE) },
  );
  expect(res).toBe(true);
});

test("la temperatura cálida sube el rojo respecto al azul", async ({ page }) => {
  await openHarness(page);
  const res = await page.evaluate(
    async (src) => {
      const bin = atob(src.b64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
      const ab = u8.buffer as ArrayBuffer;
      const t = (
        window as unknown as {
          __tolva: { convert(r: unknown, b: ArrayBuffer): Promise<{ data: ArrayBuffer }> };
        }
      ).__tolva;
      const base = JSON.parse(src.recipeJson) as object;
      const neutral = await t.convert(base, ab);
      const warmRecipe = {
        ...base,
        ops: [
          {
            type: "adjust",
            brightness: 0,
            contrast: 0,
            saturation: 0,
            temperature: 100,
            grayscale: false,
          },
        ],
      };
      const warm = await t.convert(warmRecipe, ab);

      const mean = async (bytes: ArrayBuffer): Promise<{ r: number; b: number }> => {
        const bitmap = await createImageBitmap(new Blob([bytes]));
        const c = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = c.getContext("2d")!;
        ctx.drawImage(bitmap, 0, 0);
        const d = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
        bitmap.close();
        let r = 0;
        let b = 0;
        for (let i = 0; i < d.length; i += 4) {
          r += d[i];
          b += d[i + 2];
        }
        return { r: r / (d.length / 4), b: b / (d.length / 4) };
      };

      const n = await mean(neutral.data);
      const w = await mean(warm.data);
      return { neutral: n.r - n.b, warm: w.r - w.b };
    },
    { b64: fixture("gradient.png"), recipeJson: JSON.stringify(RECIPE) },
  );
  // El calentamiento debe aumentar el sesgo rojo−azul respecto al neutro.
  expect(res.warm).toBeGreaterThan(res.neutral);
});

test("la marca de agua de imagen dibuja un logo en el centro", async ({ page }) => {
  await openHarness(page);
  const res = await page.evaluate(
    async (src) => {
      const bin = atob(src.b64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
      const t = (
        window as unknown as {
          __tolva: { convert(r: unknown, b: ArrayBuffer): Promise<{ data: ArrayBuffer }> };
        }
      ).__tolva;

      // Logo rojo 64×64, generado en el navegador y pasado como data URL.
      const logoCanvas = new OffscreenCanvas(64, 64);
      const lctx = logoCanvas.getContext("2d")!;
      lctx.fillStyle = "#ff0000";
      lctx.fillRect(0, 0, 64, 64);
      const logoBlob = await logoCanvas.convertToBlob({ type: "image/png" });
      const logoDataUrl = await new Promise<string>((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.readAsDataURL(logoBlob);
      });

      const recipe = {
        ...(JSON.parse(src.recipeJson) as object),
        ops: [
          {
            type: "watermark",
            kind: "image",
            imageDataUrl: logoDataUrl,
            opacity: 1,
            position: "center",
          },
        ],
      };
      const r = await t.convert(recipe, u8.buffer as ArrayBuffer);
      const bitmap = await createImageBitmap(new Blob([r.data]));
      const c = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = c.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const cx = Math.floor(bitmap.width / 2);
      const cy = Math.floor(bitmap.height / 2);
      const d = ctx.getImageData(cx, cy, 1, 1).data;
      bitmap.close();
      return { r: d[0], g: d[1], b: d[2] };
    },
    { b64: fixture("gradient.png"), recipeJson: JSON.stringify(RECIPE) },
  );
  // El centro queda cubierto por el logo rojo opaco.
  expect(res.r).toBeGreaterThan(200);
  expect(res.g).toBeLessThan(100);
  expect(res.b).toBeLessThan(100);
});
