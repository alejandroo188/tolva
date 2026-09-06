import { describe, expect, it } from "vitest";
import {
  centeredRectForRatio,
  clampRect,
  resizeFree,
  resizeWithLockedRatio,
  rotatedBoundingBox,
} from "../../src/lib/domain/crop";

describe("crop.clampRect", () => {
  it("fija un rectángulo fuera de límites dentro de ellos", () => {
    expect(
      clampRect({ x: -5, y: -5, width: 200, height: 200 }, { width: 100, height: 100 }),
    ).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  });

  it("recorta el tamaño al límite y recoloca el origen", () => {
    expect(
      clampRect({ x: 50, y: 50, width: 100, height: 100 }, { width: 100, height: 100 }),
    ).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  });

  it("redondea a enteros", () => {
    expect(
      clampRect({ x: 10.6, y: 10.4, width: 50.4, height: 49.6 }, { width: 100, height: 100 }),
    ).toEqual({
      x: 11,
      y: 10,
      width: 50,
      height: 50,
    });
  });

  it("devuelve 1×1 ante límites inválidos", () => {
    expect(clampRect({ x: 0, y: 0, width: 10, height: 10 }, { width: 0, height: 10 })).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });
});

describe("crop.centeredRectForRatio", () => {
  it("llena el contenedor cuando las proporciones coinciden", () => {
    expect(centeredRectForRatio({ width: 1600, height: 900 }, { w: 16, h: 9 })).toEqual({
      x: 0,
      y: 0,
      width: 1600,
      height: 900,
    });
  });

  it("centra y recorta a la proporción pedida", () => {
    expect(centeredRectForRatio({ width: 1000, height: 1000 }, { w: 16, h: 9 })).toEqual({
      x: 0,
      y: 219,
      width: 1000,
      height: 562,
    });
  });

  it("devuelve 1×1 ante proporción inválida", () => {
    expect(centeredRectForRatio({ width: 100, height: 100 }, { w: 0, h: 9 })).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });
});

describe("crop.resizeWithLockedRatio — asas de esquina", () => {
  const bounds = { width: 1000, height: 1000 };

  it("mantiene la proporción 1:1 arrastrando la esquina se", () => {
    const r = resizeWithLockedRatio(
      { x: 100, y: 100, width: 200, height: 200 },
      "se",
      { x: 400, y: 300 },
      { w: 1, h: 1 },
      bounds,
    );
    expect(r).toEqual({ x: 100, y: 100, width: 300, height: 300 });
  });

  it("mantiene la proporción 1:1 arrastrando la esquina nw (ancla se)", () => {
    const r = resizeWithLockedRatio(
      { x: 100, y: 100, width: 200, height: 200 },
      "nw",
      { x: 0, y: 0 },
      { w: 1, h: 1 },
      bounds,
    );
    expect(r).toEqual({ x: 0, y: 0, width: 300, height: 300 });
  });

  it("mantiene 16:9 con la dimensión dominante", () => {
    const r = resizeWithLockedRatio(
      { x: 0, y: 0, width: 100, height: 100 },
      "se",
      { x: 160, y: 90 },
      { w: 16, h: 9 },
      bounds,
    );
    expect(r.width / r.height).toBeCloseTo(16 / 9, 3);
    expect(r.width).toBe(160);
    expect(r.height).toBe(90);
  });

  it("mantiene 16:9 cuando domina la altura", () => {
    const r = resizeWithLockedRatio(
      { x: 0, y: 0, width: 100, height: 100 },
      "se",
      { x: 160, y: 180 },
      { w: 16, h: 9 },
      bounds,
    );
    expect(r.width / r.height).toBeCloseTo(16 / 9, 3);
    expect(r).toEqual({ x: 0, y: 0, width: 320, height: 180 });
  });

  it("arrastrando la esquina ne mantiene la proporción 1:1", () => {
    const r = resizeWithLockedRatio(
      { x: 100, y: 100, width: 200, height: 200 },
      "ne",
      { x: 400, y: 0 },
      { w: 1, h: 1 },
      bounds,
    );
    expect(r).toEqual({ x: 100, y: 0, width: 300, height: 300 });
  });

  it("arrastrando la esquina sw mantiene la proporción 1:1", () => {
    const r = resizeWithLockedRatio(
      { x: 100, y: 100, width: 200, height: 200 },
      "sw",
      { x: 0, y: 400 },
      { w: 1, h: 1 },
      bounds,
    );
    expect(r).toEqual({ x: 0, y: 100, width: 300, height: 300 });
  });

  it("fija el resultado dentro de los límites", () => {
    const r = resizeWithLockedRatio(
      { x: 900, y: 900, width: 50, height: 50 },
      "se",
      { x: 5000, y: 5000 },
      { w: 1, h: 1 },
      bounds,
    );
    expect(r.width).toBeLessThanOrEqual(1000);
    expect(r.height).toBeLessThanOrEqual(1000);
    expect(r.x + r.width).toBeLessThanOrEqual(1000);
    expect(r.y + r.height).toBeLessThanOrEqual(1000);
  });
});

describe("crop.resizeWithLockedRatio — asas de borde", () => {
  const bounds = { width: 1000, height: 1000 };

  it("arrastrando la asa e (borde derecho) mantiene la proporción", () => {
    const r = resizeWithLockedRatio(
      { x: 0, y: 0, width: 100, height: 100 },
      "e",
      { x: 200, y: 500 },
      { w: 1, h: 1 },
      bounds,
    );
    expect(r).toEqual({ x: 0, y: 0, width: 200, height: 200 });
  });

  it("arrastrando la asa n (borde superior) mantiene la proporción", () => {
    const r = resizeWithLockedRatio(
      { x: 0, y: 0, width: 100, height: 100 },
      "n",
      { x: 500, y: -50 },
      { w: 1, h: 1 },
      bounds,
    );
    expect(r).toEqual({ x: 0, y: 0, width: 150, height: 150 });
  });

  it("con proporción inválida devuelve el rectángulo fijado", () => {
    const r = resizeWithLockedRatio(
      { x: 0, y: 0, width: 100, height: 100 },
      "e",
      { x: 200, y: 200 },
      { w: 0, h: 1 },
      bounds,
    );
    expect(r).toEqual(clampRect({ x: 0, y: 0, width: 100, height: 100 }, bounds));
  });
});

describe("crop.resizeFree", () => {
  const bounds = { width: 1000, height: 1000 };

  it("arrastra la esquina se ampliando libremente", () => {
    expect(
      resizeFree({ x: 100, y: 100, width: 200, height: 200 }, "se", { x: 400, y: 350 }, bounds),
    ).toEqual({
      x: 100,
      y: 100,
      width: 300,
      height: 250,
    });
  });

  it("arrastra la esquina nw con el ancla fija en se", () => {
    expect(
      resizeFree({ x: 100, y: 100, width: 200, height: 200 }, "nw", { x: 0, y: 50 }, bounds),
    ).toEqual({
      x: 0,
      y: 50,
      width: 300,
      height: 250,
    });
  });

  it("nunca se sale de los límites ni colapsa por debajo de 1×1", () => {
    const r = resizeFree(
      { x: 100, y: 100, width: 200, height: 200 },
      "nw",
      { x: 2000, y: 2000 },
      bounds,
    );
    expect(r.x + r.width).toBeLessThanOrEqual(1000);
    expect(r.width).toBeGreaterThanOrEqual(1);
    expect(r.height).toBeGreaterThanOrEqual(1);
  });
});

describe("crop.rotatedBoundingBox", () => {
  it("180° deja el rectángulo igual", () => {
    expect(rotatedBoundingBox({ x: 10, y: 20, width: 30, height: 40 }, 180)).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    });
  });

  it("90° intercambia ancho y alto manteniendo el centro", () => {
    expect(rotatedBoundingBox({ x: 0, y: 0, width: 100, height: 200 }, 90)).toEqual({
      x: -50,
      y: 50,
      width: 200,
      height: 100,
    });
  });

  it("270° produce el mismo bounding box que 90°", () => {
    expect(rotatedBoundingBox({ x: 0, y: 0, width: 100, height: 200 }, 270)).toEqual(
      rotatedBoundingBox({ x: 0, y: 0, width: 100, height: 200 }, 90),
    );
  });
});
