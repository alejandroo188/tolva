/**
 * E2E de calidad y no-bloqueo del motor de imagen (§8.3):
 * — Lanczos3 reduce 4000×3000 → 400×300 con menos aliasing que la línea base
 *   de `drawImage` (métrica objetiva de energía de alta frecuencia).
 * — El hilo principal no se bloquea durante una conversión de 4000×3000
 *   (TBT < 50 ms, medido con `PerformanceObserver` de tareas largas).
 */

import { expect, test } from "@playwright/test";
import { fixture, openHarness } from "./image-harness";

test("Lanczos3 reduce 4000×3000→400×300 con menos aliasing que drawImage (energía de alta frecuencia)", async ({
  page,
}) => {
  await openHarness(page);

  const result = await page.evaluate(async (src) => {
    const bin = atob(src);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
    const ab = u8.buffer as ArrayBuffer;

    const t = (
      window as unknown as {
        __tolva: {
          convert(recipe: unknown, bytes: ArrayBuffer): Promise<{ data: ArrayBuffer }>;
        };
      }
    ).__tolva;

    function highFreqEnergy(data: ImageData): number {
      const w = data.width;
      const h = data.height;
      const d = data.data;
      const g = new Float32Array(w * h);
      for (let i = 0; i < w * h; i += 1) {
        const j = i * 4;
        g[i] = 0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2];
      }
      let energy = 0;
      for (let y = 1; y < h - 1; y += 1) {
        for (let x = 1; x < w - 1; x += 1) {
          const i = y * w + x;
          const lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
          energy += lap * lap;
        }
      }
      return energy;
    }

    // Línea base: drawImage con suavizado desactivado (vecino más próximo), el
    // remuestreo "ingenuo" que aliasa las rayas finas de 4 px del fixture.
    const srcBitmap = await createImageBitmap(new Blob([ab]));
    const naiveCanvas = document.createElement("canvas");
    naiveCanvas.width = 400;
    naiveCanvas.height = 300;
    const nctx = naiveCanvas.getContext("2d");
    if (!nctx) throw new Error("2d no disponible");
    nctx.imageSmoothingEnabled = false;
    nctx.drawImage(srcBitmap, 0, 0, 400, 300);
    srcBitmap.close();
    const naiveEnergy = highFreqEnergy(nctx.getImageData(0, 0, 400, 300));

    // Pipeline real: `resize` con `mode: "fill"` → `resample` elige Lanczos3.
    const recipe = {
      source: {
        id: "q",
        name: "q",
        type: "image/png",
        bytes: ab.byteLength,
        width: 4000,
        height: 3000,
        exifOrientation: 1,
      },
      ops: [{ type: "resize", width: 400, height: 300, mode: "fill", upscale: false }],
      output: { format: "png", quality: 80, stripMetadata: true },
    };
    const res = await t.convert(recipe, ab);
    const bitmap = await createImageBitmap(new Blob([res.data]));
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d no disponible");
    ctx.drawImage(bitmap, 0, 0, 400, 300);
    bitmap.close();
    const lanczosEnergy = highFreqEnergy(ctx.getImageData(0, 0, 400, 300));

    return { naiveEnergy, lanczosEnergy };
  }, fixture("large-4000x3000.png"));

  // Lanczos3 filtra las altas frecuencias: su energía residual (aliasing) debe
  // quedar muy por debajo de la del vecino más próximo.
  expect(result.lanczosEnergy).toBeLessThan(result.naiveEnergy);
  expect(result.lanczosEnergy).toBeLessThan(result.naiveEnergy * 0.5);
});

test("el hilo principal no se bloquea en una conversión de 4000×3000 (TBT < 50 ms)", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "`longtask` sólo lo emite Chromium; en Firefox/WebKit no existe ese tipo de entrada",
  );
  await openHarness(page);

  const result = await page.evaluate(async (src) => {
    const bin = atob(src);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
    const ab = u8.buffer as ArrayBuffer;

    const t = (
      window as unknown as {
        __tolva: {
          convert(recipe: unknown, bytes: ArrayBuffer): Promise<{ data: ArrayBuffer }>;
        };
      }
    ).__tolva;

    const recipe = {
      source: {
        id: "t",
        name: "t",
        type: "image/png",
        bytes: ab.byteLength,
        width: 4000,
        height: 3000,
        exifOrientation: 1,
      },
      ops: [{ type: "resize", width: 400, height: 300, mode: "fill", upscale: false }],
      output: { format: "png", quality: 80, stripMetadata: true },
    };

    // Calentamiento fuera de la ventana medida: la primera llamada crea el pool
    // y carga el códec (en el worker). Sólo se mide la conversión real.
    await t.convert(recipe, ab);

    const longTasks: number[] = [];
    let observer: PerformanceObserver | null = null;
    if (typeof PerformanceObserver !== "undefined") {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longTasks.push(entry.duration);
      });
      try {
        observer.observe({ type: "longtask" });
      } catch {
        observer = null;
      }
    }

    await t.convert(recipe, ab);
    // Deja que el observer entregue las tareas largas pendientes.
    await new Promise((r) => setTimeout(r, 100));
    observer?.disconnect();

    const tbt = longTasks.reduce((sum, d) => sum + Math.max(0, d - 50), 0);
    return {
      supported: observer !== null,
      count: longTasks.length,
      max: longTasks.length ? Math.max(...longTasks) : 0,
      tbt,
    };
  }, fixture("large-4000x3000.png"));

  expect(result.supported).toBe(true);
  // El criterio §8.3 exige TBT < 50 ms. Con todo el trabajo en el worker, no
  // debería registrarse ninguna tarea larga (>50 ms) en el hilo principal.
  expect(result.count).toBe(0);
  expect(result.tbt).toBeLessThan(50);
});
