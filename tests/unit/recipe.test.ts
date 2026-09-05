import { describe, expect, it } from "vitest";
import {
  deserializeRecipe,
  isEditRecipe,
  OP_ORDER,
  opType,
  serializeRecipe,
  sortOps,
  stableStringify,
  validateRecipe,
} from "../../src/lib/domain/recipe";
import type { EditRecipe } from "../../src/lib/domain/types";

const validRecipe: EditRecipe = {
  source: {
    id: "abc",
    name: "foto.jpg",
    type: "image/jpeg",
    bytes: 1024,
    width: 1000,
    height: 800,
    exifOrientation: 6,
  },
  ops: [
    { type: "crop", x: 0, y: 0, width: 800, height: 800 },
    { type: "rotate", degrees: 90 },
    { type: "flip", axis: "horizontal" },
    { type: "resize", width: 800, height: 800, mode: "fit", upscale: false },
    { type: "adjust", brightness: 0, contrast: 0, saturation: 0 },
    { type: "watermark", text: "Tolva", opacity: 0.5, position: "center" },
  ],
  output: { format: "webp", quality: 80, stripMetadata: true },
};

describe("recipe.OP_ORDER / sortOps", () => {
  it("define el orden canónico", () => {
    expect(OP_ORDER).toEqual(["crop", "rotate", "flip", "resize", "adjust", "watermark"]);
  });

  it("reordena las operaciones al orden canónico", () => {
    const ops = [...validRecipe.ops].reverse();
    expect(sortOps(ops).map(opType)).toEqual([
      "crop",
      "rotate",
      "flip",
      "resize",
      "adjust",
      "watermark",
    ]);
  });

  it("es estable dentro del mismo tipo", () => {
    const ops = [
      { type: "crop", x: 0, y: 0, width: 10, height: 10 },
      { type: "crop", x: 5, y: 5, width: 20, height: 20 },
    ] as const;
    expect(sortOps([...ops])).toEqual([...ops]);
  });
});

describe("recipe.validateRecipe", () => {
  it("acepta una receta válida", () => {
    const r = validateRecipe(validRecipe);
    expect(r.source.id).toBe("abc");
    expect(r.ops).toHaveLength(6);
    expect(r.output.format).toBe("webp");
  });

  it("acepta maxBytes opcional", () => {
    const r = validateRecipe({ ...validRecipe, output: { ...validRecipe.output, maxBytes: 5000 } });
    expect(r.output.maxBytes).toBe(5000);
  });

  it("rechaza entradas que no son objeto", () => {
    expect(() => validateRecipe(42)).toThrow();
    expect(() => validateRecipe(null)).toThrow(/objeto/);
  });

  it("rechaza source inválido", () => {
    expect(() => validateRecipe({ ...validRecipe, source: undefined })).toThrow(/source/);
    expect(() =>
      validateRecipe({ ...validRecipe, source: { ...validRecipe.source, id: "" } }),
    ).toThrow(/id/);
    expect(() =>
      validateRecipe({ ...validRecipe, source: { ...validRecipe.source, bytes: -1 } }),
    ).toThrow(/bytes/);
    expect(() =>
      validateRecipe({ ...validRecipe, source: { ...validRecipe.source, width: 0 } }),
    ).toThrow(/width/);
    expect(() =>
      validateRecipe({ ...validRecipe, source: { ...validRecipe.source, exifOrientation: 9 } }),
    ).toThrow(/exifOrientation/);
  });

  it("rechaza ops inválidas", () => {
    expect(() => validateRecipe({ ...validRecipe, ops: "no" })).toThrow(/ops/);
    expect(() =>
      validateRecipe({ ...validRecipe, ops: [{ type: "crop", x: 0, y: 0, width: 0, height: 10 }] }),
    ).toThrow(/crop/);
    expect(() =>
      validateRecipe({ ...validRecipe, ops: [{ type: "rotate", degrees: 45 }] }),
    ).toThrow(/rotate/);
    expect(() =>
      validateRecipe({ ...validRecipe, ops: [{ type: "flip", axis: "diagonal" }] }),
    ).toThrow(/flip/);
    expect(() =>
      validateRecipe({
        ...validRecipe,
        ops: [{ type: "resize", width: 1, height: 1, mode: "warp", upscale: true }],
      }),
    ).toThrow(/resize/);
    expect(() =>
      validateRecipe({
        ...validRecipe,
        ops: [{ type: "adjust", brightness: 200, contrast: 0, saturation: 0 }],
      }),
    ).toThrow(/adjust/);
    expect(() =>
      validateRecipe({
        ...validRecipe,
        ops: [{ type: "watermark", text: "x", opacity: 2, position: "center" }],
      }),
    ).toThrow(/watermark/);
    expect(() => validateRecipe({ ...validRecipe, ops: [{ type: "explode" }] })).toThrow(
      /desconocido/,
    );
  });

  it("rechaza output inválido", () => {
    expect(() => validateRecipe({ ...validRecipe, output: undefined })).toThrow(/output/);
    expect(() =>
      validateRecipe({ ...validRecipe, output: { ...validRecipe.output, format: "tiff" } }),
    ).toThrow(/format/);
    expect(() =>
      validateRecipe({ ...validRecipe, output: { ...validRecipe.output, quality: 101 } }),
    ).toThrow(/quality/);
    expect(() =>
      validateRecipe({ ...validRecipe, output: { ...validRecipe.output, stripMetadata: "sí" } }),
    ).toThrow(/stripMetadata/);
    expect(() =>
      validateRecipe({ ...validRecipe, output: { ...validRecipe.output, maxBytes: -1 } }),
    ).toThrow(/maxBytes/);
  });
});

describe("recipe.isEditRecipe", () => {
  it("devuelve true para recetas válidas", () => {
    expect(isEditRecipe(validRecipe)).toBe(true);
  });

  it("devuelve false para recetas inválidas", () => {
    expect(isEditRecipe(null)).toBe(false);
    expect(isEditRecipe({ ...validRecipe, output: { ...validRecipe.output, quality: -1 } })).toBe(
      false,
    );
  });
});

describe("recipe.serializeRecipe / deserializeRecipe", () => {
  it("serializa de forma estable y ordena las ops", () => {
    const reordered: EditRecipe = { ...validRecipe, ops: [...validRecipe.ops].reverse() };
    const a = serializeRecipe(reordered);
    const b = serializeRecipe(reordered);
    expect(a).toBe(b);
    const parsed = JSON.parse(a) as { ops: { type: string }[] };
    expect(parsed.ops.map((o) => o.type)).toEqual([
      "crop",
      "rotate",
      "flip",
      "resize",
      "adjust",
      "watermark",
    ]);
  });

  it("round-trip: deserializar lo serializado devuelve la receta válida", () => {
    const json = serializeRecipe(validRecipe);
    const r = deserializeRecipe(json);
    expect(r).toEqual(validRecipe);
  });

  it("lanza error legible ante JSON inválido", () => {
    expect(() => deserializeRecipe("no soy json")).toThrow(/JSON/);
  });

  it("lanza error ante receta inválida", () => {
    expect(() => deserializeRecipe(JSON.stringify({ source: {} }))).toThrow();
  });
});

describe("recipe.stableStringify", () => {
  it("es independiente del orden de las claves", () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });

  it("ordena claves anidadas de forma recursiva", () => {
    expect(stableStringify({ x: { b: 1, a: 2 } })).toBe('{"x":{"a":2,"b":1}}');
  });

  it("no reordena arrays", () => {
    expect(stableStringify([2, 1])).toBe("[2,1]");
  });
});
