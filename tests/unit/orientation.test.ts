import { describe, expect, it } from "vitest";
import { isExifOrientation, orientedDimensions } from "../../src/lib/domain/orientation";

describe("orientation.isExifOrientation", () => {
  it("acepta 1..8", () => {
    for (let i = 1; i <= 8; i += 1) expect(isExifOrientation(i)).toBe(true);
  });

  it("rechaza valores fuera de rango o no enteros", () => {
    expect(isExifOrientation(0)).toBe(false);
    expect(isExifOrientation(9)).toBe(false);
    expect(isExifOrientation(1.5)).toBe(false);
    expect(isExifOrientation(Number.NaN)).toBe(false);
    expect(isExifOrientation(-3)).toBe(false);
  });
});

describe("orientation.orientedDimensions", () => {
  it("no intercambia ancho/alto para las orientaciones 1–4", () => {
    for (const o of [1, 2, 3, 4] as const) {
      expect(orientedDimensions(800, 600, o)).toEqual({ width: 800, height: 600 });
    }
  });

  it("intercambia ancho/alto para las orientaciones 5–8 (rotación 90°)", () => {
    for (const o of [5, 6, 7, 8] as const) {
      expect(orientedDimensions(800, 600, o)).toEqual({ width: 600, height: 800 });
    }
  });

  it("devuelve 1×1 ante dimensiones inválidas", () => {
    expect(orientedDimensions(0, 600, 6)).toEqual({ width: 1, height: 1 });
    expect(orientedDimensions(800, -1, 6)).toEqual({ width: 1, height: 1 });
    expect(orientedDimensions(800.5, 600, 6)).toEqual({ width: 1, height: 1 });
  });
});
