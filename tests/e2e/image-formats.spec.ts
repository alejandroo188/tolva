/**
 * E2E de formatos de imagen (§8.3): conversión real de fixtures a cada formato
 * de salida verificada por bytes mágicos, orientación EXIF 6 aplicada a los
 * píxeles, borrado de metadatos (sin APP1/GPS), rasterización de SVG y
 * decodificación de GIF/TIFF/BMP de entrada.
 */

import { expect, test } from "@playwright/test";
import type { OutputFormat } from "../../src/lib/domain/types";
import { convert, fixture, makeRecipe, openHarness } from "./image-harness";

/** Aserciones por bytes mágicos específicos de cada formato de salida. */
function expectMagic(magic: number[], format: OutputFormat): void {
  switch (format) {
    case "jpeg":
      expect(magic.slice(0, 3)).toEqual([0xff, 0xd8, 0xff]);
      break;
    case "png":
      expect(magic.slice(0, 8)).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      break;
    case "webp":
      expect(magic.slice(0, 4)).toEqual([0x52, 0x49, 0x46, 0x46]); // RIFF
      expect(magic.slice(8, 12)).toEqual([0x57, 0x45, 0x42, 0x50]); // WEBP
      break;
    case "avif":
      expect(magic.slice(4, 8)).toEqual([0x66, 0x74, 0x79, 0x70]); // ftyp
      break;
    case "jxl": {
      const codestream = magic[0] === 0xff && magic[1] === 0x0a;
      const container =
        magic[0] === 0x00 && magic[1] === 0x00 && magic[2] === 0x00 && magic[3] === 0x0c;
      expect(codestream || container).toBe(true);
      break;
    }
    case "gif":
      expect(magic.slice(0, 3)).toEqual([0x47, 0x49, 0x46]); // GIF
      break;
    case "bmp":
      expect(magic.slice(0, 2)).toEqual([0x42, 0x4d]); // BM
      break;
  }
}

const OUTPUT_FORMATS: OutputFormat[] = ["jpeg", "png", "webp", "avif", "jxl", "gif", "bmp"];

for (const format of OUTPUT_FORMATS) {
  test(`convierte gradient.png a ${format} (bytes mágicos)`, async ({ page }) => {
    await openHarness(page);
    const res = await convert(
      page,
      makeRecipe({ format, type: "image/png", width: 640, height: 360 }),
      fixture("gradient.png"),
    );

    expect(res.detected).toBe(format);
    expectMagic(res.magic, format);
    expect(res.width).toBe(640);
    expect(res.height).toBe(360);
    expect(res.bytes).toBeGreaterThan(0);
  });
}

test("aplica la orientación EXIF 6 a los píxeles (800×600 → 600×800)", async ({ page }) => {
  await openHarness(page);
  // El fixture `exif.jpg` tiene orientación 6 + GPS. La receta declara lo que
  // `readExif` habría detectado: orientación 6 sobre 800×600.
  const res = await convert(
    page,
    makeRecipe({ format: "png", type: "image/jpeg", width: 800, height: 600, orientation: 6 }),
    fixture("exif.jpg"),
  );

  expect(res.detected).toBe("png");
  expect(res.width).toBe(600);
  expect(res.height).toBe(800);
});

test("al exportar con borrado de metadatos no sobrevive GPS ni orientación de origen", async ({
  page,
}) => {
  await openHarness(page);
  const result = await page.evaluate(async (src) => {
    const t = (
      window as unknown as {
        __tolva: {
          convert(recipe: unknown, bytes: ArrayBuffer): Promise<{ data: ArrayBuffer }>;
          readExif(bytes: ArrayBuffer): { hasExif: boolean; hasGps: boolean; orientation: number };
        };
      }
    ).__tolva;
    const b64 = src as string;
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
    const ab = u8.buffer as ArrayBuffer;
    const recipe = {
      source: {
        id: "t",
        name: "t",
        type: "image/jpeg",
        bytes: 0,
        width: 800,
        height: 600,
        exifOrientation: 1,
      },
      ops: [],
      output: { format: "jpeg", quality: 85, stripMetadata: true },
    };
    const res = await t.convert(recipe, ab);
    // La re-codificación por canvas descarta el EXIF de origen. WebKit añade un
    // EXIF mínimo propio (orientación 1, sin GPS); Chromium no añade ninguno. Lo
    // invariante entre navegadores es que no sobreviven ni el GPS ni la
    // orientación de la fuente (que aquí era 6 y se re-codifica ya enderezada).
    const exif = t.readExif(res.data);
    return { hasGps: exif.hasGps, orientation: exif.orientation };
  }, fixture("exif.jpg"));

  expect(result.hasGps).toBe(false);
  expect(result.orientation).toBe(1);
});

test("rasteriza SVG a PNG en el hilo principal", async ({ page }) => {
  await openHarness(page);
  const res = await convert(
    page,
    makeRecipe({ format: "png", type: "image/svg+xml", width: 320, height: 180 }),
    fixture("sample.svg"),
  );

  expect(res.detected).toBe("png");
  expect(res.width).toBe(320);
  expect(res.height).toBe(180);
});

test("decodifica GIF, TIFF y BMP de entrada a PNG", async ({ page }) => {
  await openHarness(page);

  const gif = await convert(
    page,
    makeRecipe({ format: "png", type: "image/gif", width: 64, height: 64 }),
    fixture("animated.gif"),
  );
  expect(gif.detected).toBe("png");
  expect(gif.width).toBe(64);
  expect(gif.height).toBe(64);

  const tiff = await convert(
    page,
    makeRecipe({ format: "png", type: "image/tiff", width: 80, height: 60 }),
    fixture("sample.tiff"),
  );
  expect(tiff.detected).toBe("png");
  expect(tiff.width).toBe(80);
  expect(tiff.height).toBe(60);

  const bmp = await convert(
    page,
    makeRecipe({ format: "png", type: "image/bmp", width: 64, height: 48 }),
    fixture("sample.bmp"),
  );
  expect(bmp.detected).toBe("png");
  expect(bmp.width).toBe(64);
  expect(bmp.height).toBe(48);
});
