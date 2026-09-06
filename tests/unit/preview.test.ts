import { describe, expect, it } from "vitest";
import { buildRecipe, emptyDraft, makePreviewRecipe } from "../../src/lib/image/preview";
import type { SourceItem } from "../../src/lib/image/intake";
import { OP_ORDER } from "../../src/lib/domain/recipe";

const source: SourceItem = {
  id: "s1",
  name: "foto.jpg",
  type: "image/jpeg",
  bytes: 1000,
  data: new ArrayBuffer(0),
  objectUrl: "blob:mock",
  format: "jpeg",
  width: 4000,
  height: 3000,
  exifOrientation: 6,
  hasExif: true,
  hasGps: false,
  fingerprint: "foto.jpg:1000:1",
};

const output = { format: "webp" as const, quality: 80, stripMetadata: true };

describe("buildRecipe", () => {
  it("compone la receta a partir de la fuente y el borrador", () => {
    const recipe = buildRecipe(source, { ops: [], output });
    expect(recipe.source.width).toBe(4000);
    expect(recipe.source.height).toBe(3000);
    expect(recipe.source.exifOrientation).toBe(6);
    expect(recipe.ops).toEqual([]);
    expect(recipe.output.format).toBe("webp");
  });
});

describe("makePreviewRecipe", () => {
  it("añade un resize final que acota al lado máximo", () => {
    const recipe = buildRecipe(source, emptyDraft(output));
    const preview = makePreviewRecipe(recipe, 800);
    const last = preview.ops[preview.ops.length - 1];
    expect(last.type).toBe("resize");
    // El worker reordena al orden canónico; el resize añadido se coloca en su sitio.
    const indices = preview.ops.map((op) => OP_ORDER.indexOf(op.type));
    expect(indices.every((i, j) => j === 0 || indices[j - 1] <= i)).toBe(true);
  });

  it("no muta la receta original", () => {
    const recipe = buildRecipe(source, emptyDraft(output));
    const before = recipe.ops.length;
    makePreviewRecipe(recipe);
    expect(recipe.ops.length).toBe(before);
  });
});
