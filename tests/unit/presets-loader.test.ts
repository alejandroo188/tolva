import { describe, expect, it } from "vitest";
import { SOCIAL_PRESETS, VIDEO_PRESETS } from "../../src/lib/presets";
import { serializeRecipe, deserializeRecipe } from "../../src/lib/domain/recipe";
import type { EditRecipe } from "../../src/lib/domain/types";

/**
 * Prueba funcional del cableado real: los ficheros `src/config/*.json` pasan
 * por el cargador (`src/lib/presets.ts`), se validan en tiempo de carga y
 * quedan disponibles como constantes tipadas. Cubre el criterio "presets
 * editables sin tocar código" y hace un round-trip completo de una receta.
 */
describe("presets loader (ficheros reales → export tipado)", () => {
  it("expone los seis presets sociales obligatorios con su proporción", () => {
    const byId = new Map(SOCIAL_PRESETS.map((p) => [p.id, p]));
    const expected: Record<string, { w: number; h: number }> = {
      avatar: { w: 1, h: 1 },
      historia: { w: 9, h: 16 },
      post: { w: 1, h: 1 },
      "post-4-5": { w: 4, h: 5 },
      portada: { w: 3, h: 2 },
      miniatura: { w: 16, h: 9 },
    };
    for (const [id, ratio] of Object.entries(expected)) {
      const preset = byId.get(id);
      expect(preset, `falta el preset social "${id}"`).toBeDefined();
      expect(preset?.ratio).toEqual(ratio);
    }
  });

  it("expone los presets de vídeo esperados con dimensiones coherentes", () => {
    const ids = VIDEO_PRESETS.map((p) => p.id);
    expect(ids).toEqual(["480p", "720p", "1080p", "4k"]);
    for (const p of VIDEO_PRESETS) {
      expect(p.height).toBe(Math.round((p.width * 9) / 16));
      expect(p.fps).toBeGreaterThan(0);
      expect(p.videoBitrate).toBeGreaterThan(0);
      expect(p.audioBitrate).toBeGreaterThan(0);
    }
  });
});

describe("receta — round-trip funcional sobre el dominio", () => {
  const recipe: EditRecipe = {
    source: {
      id: "fixture-1",
      name: "sample.svg",
      type: "image/svg+xml",
      bytes: 341,
      width: 320,
      height: 180,
      exifOrientation: 1,
    },
    ops: [
      { type: "crop", x: 0, y: 0, width: 180, height: 180 },
      { type: "rotate", degrees: 90 },
      { type: "resize", width: 1080, height: 1920, mode: "cover", upscale: false },
    ],
    output: { format: "webp", quality: 82, stripMetadata: true, maxBytes: 250_000 },
  };

  it("serializa y deserializa sin pérdida", () => {
    const json = serializeRecipe(recipe);
    expect(deserializeRecipe(json)).toEqual(recipe);
  });
});
