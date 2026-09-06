import { describe, expect, it } from "vitest";
import {
  applyPoint,
  computeEditTransform,
  invert,
  multiply,
  rectCorners,
  transformRect,
  translate,
} from "../../src/lib/image/edit-geometry";

const full = { x: 0, y: 0, width: 100, height: 50 };

describe("computeEditTransform", () => {
  it("sin operaciones devuelve identidad y las dimensiones de la fuente", () => {
    const t = computeEditTransform({
      crop: full,
      rotation: 0,
      straighten: 0,
      flipH: false,
      flipV: false,
    });
    expect(t.outW).toBe(100);
    expect(t.outH).toBe(50);
    expect(applyPoint(t.matrix, 0, 0)).toEqual([0, 0]);
    expect(applyPoint(t.matrix, 100, 50)).toEqual([100, 50]);
  });

  it("el recorte traslada el origen (crop primero)", () => {
    const crop = { x: 10, y: 20, width: 30, height: 40 };
    const t = computeEditTransform({
      crop,
      rotation: 0,
      straighten: 0,
      flipH: false,
      flipV: false,
    });
    expect(t.outW).toBe(30);
    expect(t.outH).toBe(40);
    expect(applyPoint(t.matrix, 10, 20)).toEqual([0, 0]);
    expect(applyPoint(t.matrix, 40, 60)).toEqual([30, 40]);
  });

  it("la rotación de 90° intercambia las dimensiones de salida", () => {
    const t = computeEditTransform({
      crop: full,
      rotation: 90,
      straighten: 0,
      flipH: false,
      flipV: false,
    });
    expect(t.outW).toBe(50);
    expect(t.outH).toBe(100);
  });

  it("el volteo horizontal mapea el borde izquierdo al derecho", () => {
    const t = computeEditTransform({
      crop: full,
      rotation: 0,
      straighten: 0,
      flipH: true,
      flipV: false,
    });
    const [x] = applyPoint(t.matrix, 0, 0);
    expect(x).toBeCloseTo(100, 5);
  });

  it("el enderezado libre expande el bounding box en ambos ejes", () => {
    const wide = { x: 0, y: 0, width: 640, height: 360 };
    const t = computeEditTransform({
      crop: wide,
      rotation: 0,
      straighten: 30,
      flipH: false,
      flipV: false,
    });
    expect(t.outW).toBeGreaterThan(640);
    expect(t.outH).toBeGreaterThan(360);
  });
});

describe("affinidades auxiliares", () => {
  it("invert devuelve la inversa (round-trip de un punto)", () => {
    const m = multiply(multiply(translate(12, -7), translate(3, 4)), translate(5, 1));
    const [x, y] = applyPoint(m, 8, 9);
    const [rx, ry] = applyPoint(invert(m), x, y);
    expect(rx).toBeCloseTo(8, 6);
    expect(ry).toBeCloseTo(9, 6);
  });

  it("rectCorners y transformRect devuelven las cuatro esquinas en orden", () => {
    const corners = rectCorners(full);
    expect(corners).toHaveLength(4);
    const t = computeEditTransform({
      crop: full,
      rotation: 0,
      straighten: 0,
      flipH: false,
      flipV: false,
    });
    expect(transformRect(full, t.matrix)).toEqual(corners);
  });
});
