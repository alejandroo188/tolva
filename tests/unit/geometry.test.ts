import { describe, expect, it } from "vitest";
import { contain, cover, fit } from "../../src/lib/domain/geometry";

describe("geometry.fit", () => {
  it("escala hacia abajo conservando la proporción (ancho dominante)", () => {
    const r = fit({ width: 4000, height: 3000 }, { width: 1000, height: 1000 });
    expect(r.width).toBe(1000);
    expect(r.height).toBe(750);
    expect(r.scale).toBe(0.25);
  });

  it("escala hacia abajo conservando la proporción (alto dominante)", () => {
    const r = fit({ width: 3000, height: 4000 }, { width: 1000, height: 1000 });
    expect(r.width).toBe(750);
    expect(r.height).toBe(1000);
  });

  it("no amplía por encima del original por defecto", () => {
    const r = fit({ width: 100, height: 100 }, { width: 1000, height: 1000 });
    expect(r).toEqual({ width: 100, height: 100, scale: 1 });
  });

  it("sí amplía cuando la opción upscale está activa", () => {
    const r = fit({ width: 100, height: 100 }, { width: 1000, height: 1000 }, { upscale: true });
    expect(r.width).toBe(1000);
    expect(r.height).toBe(1000);
  });

  it("redondea a entero una sola vez (sin deriva acumulada)", () => {
    const r = fit({ width: 1000, height: 1000 }, { width: 333, height: 333 });
    expect(r.width).toBe(333);
    expect(r.height).toBe(333);
  });

  it("respeta el mínimo de 1 px", () => {
    const r = fit({ width: 100000, height: 100000 }, { width: 1, height: 1 });
    expect(r.width).toBe(1);
    expect(r.height).toBe(1);
  });

  it("devuelve 1×1 ante dimensiones inválidas", () => {
    expect(fit({ width: 0, height: 100 }, { width: 100, height: 100 })).toEqual({
      width: 1,
      height: 1,
      scale: 1,
    });
    expect(fit({ width: 100, height: 100 }, { width: 0, height: 100 })).toEqual({
      width: 1,
      height: 1,
      scale: 1,
    });
    expect(fit({ width: -5, height: 100 }, { width: 100, height: 100 })).toEqual({
      width: 1,
      height: 1,
      scale: 1,
    });
  });
});

describe("geometry.contain", () => {
  it("equivale a fit", () => {
    const r = contain({ width: 4000, height: 3000 }, { width: 1000, height: 1000 });
    expect(r).toEqual(fit({ width: 4000, height: 3000 }, { width: 1000, height: 1000 }));
  });

  it("no amplía por defecto", () => {
    const r = contain({ width: 10, height: 10 }, { width: 100, height: 100 });
    expect(r.scale).toBe(1);
  });
});

describe("geometry.cover", () => {
  it("escala para cubrir el objetivo", () => {
    const r = cover({ width: 4000, height: 3000 }, { width: 1000, height: 1000 });
    expect(r.width).toBe(1333);
    expect(r.height).toBe(1000);
  });

  it("no amplía por defecto", () => {
    const r = cover({ width: 100, height: 100 }, { width: 1000, height: 1000 });
    expect(r).toEqual({ width: 100, height: 100, scale: 1 });
  });

  it("sí amplía con upscale activo", () => {
    const r = cover({ width: 100, height: 50 }, { width: 1000, height: 1000 }, { upscale: true });
    expect(r.width).toBe(2000);
    expect(r.height).toBe(1000);
  });

  it("devuelve 1×1 ante dimensiones inválidas", () => {
    expect(cover({ width: 100, height: 0 }, { width: 100, height: 100 })).toEqual({
      width: 1,
      height: 1,
      scale: 1,
    });
  });
});
