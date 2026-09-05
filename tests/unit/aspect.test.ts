import { describe, expect, it } from "vitest";
import {
  freeRatio,
  lockRatio,
  lockedHeight,
  lockedWidth,
  percentToPixels,
  pixelsToPercent,
  ratioOf,
  ratioValue,
  STANDARD_RATIOS,
} from "../../src/lib/domain/aspect";

describe("aspect.STANDARD_RATIOS", () => {
  it("incluye las seis proporciones estándar", () => {
    expect(Object.keys(STANDARD_RATIOS).sort()).toEqual(
      ["1:1", "3:2", "4:3", "4:5", "9:16", "16:9"].sort(),
    );
  });

  it("todas tienen valor numérico correcto", () => {
    expect(ratioValue(STANDARD_RATIOS["16:9"])).toBeCloseTo(16 / 9);
    expect(ratioValue(STANDARD_RATIOS["9:16"])).toBeCloseTo(9 / 16);
    expect(ratioValue(STANDARD_RATIOS["1:1"])).toBe(1);
  });
});

describe("aspect.ratioValue / ratioOf", () => {
  it("devuelve 0 para proporciones inválidas", () => {
    expect(ratioValue({ w: 0, h: 1 })).toBe(0);
    expect(ratioValue({ w: 1, h: 0 })).toBe(0);
    expect(ratioValue({ w: Number.NaN, h: 1 })).toBe(0);
  });

  it("devuelve 0 si la altura de un tamaño es 0", () => {
    expect(ratioOf({ width: 16, height: 0 })).toBe(0);
  });

  it("calcula la proporción de un tamaño", () => {
    expect(ratioOf({ width: 1920, height: 1080 })).toBeCloseTo(16 / 9);
  });
});

describe("aspect.percentToPixels / pixelsToPercent", () => {
  it("convierte porcentaje a píxeles", () => {
    expect(percentToPixels(50, 200)).toBe(100);
    expect(percentToPixels(10, 1000)).toBe(100);
  });

  it("redondea y respeta el mínimo de 1 px", () => {
    expect(percentToPixels(0.1, 100)).toBe(1);
  });

  it("convierte píxeles a porcentaje", () => {
    expect(pixelsToPercent(100, 200)).toBe(50);
    expect(pixelsToPercent(1000, 1000)).toBe(100);
  });

  it("devuelve 0 ante entradas inválidas", () => {
    expect(percentToPixels(Number.NaN, 100)).toBe(0);
    expect(percentToPixels(50, 0)).toBe(0);
    expect(pixelsToPercent(100, 0)).toBe(0);
    expect(pixelsToPercent(Number.NaN, 100)).toBe(0);
  });
});

describe("aspect.lockedHeight / lockedWidth", () => {
  it("calcula la altura a partir del ancho", () => {
    expect(lockedHeight(1600, { w: 16, h: 9 })).toBe(900);
    expect(lockedHeight(100, { w: 1, h: 1 })).toBe(100);
  });

  it("calcula el ancho a partir de la altura", () => {
    expect(lockedWidth(900, { w: 16, h: 9 })).toBe(1600);
  });

  it("devuelve 1 ante entradas inválidas", () => {
    expect(lockedHeight(100, { w: 0, h: 9 })).toBe(1);
    expect(lockedWidth(0, { w: 16, h: 9 })).toBe(1);
  });
});

describe("aspect.freeRatio / lockRatio", () => {
  it("estado libre", () => {
    expect(freeRatio()).toEqual({ locked: false });
  });

  it("estado bloqueado con proporción válida", () => {
    expect(lockRatio({ w: 16, h: 9 })).toEqual({ locked: true, ratio: { w: 16, h: 9 } });
  });

  it("una proporción inválida no bloquea", () => {
    expect(lockRatio({ w: 0, h: 9 })).toEqual({ locked: false });
  });
});
