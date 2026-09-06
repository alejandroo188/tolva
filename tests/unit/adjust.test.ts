import { describe, expect, it } from "vitest";
import {
  adjustColor,
  clampByte,
  adjustPixels,
  type AdjustParams,
} from "../../src/lib/media/adjust";

const neutral: AdjustParams = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  grayscale: false,
};

describe("adjustColor", () => {
  it("con ajustes neutros devuelve el píxel intacto", () => {
    const [r, g, b] = adjustColor(200, 100, 50, neutral);
    expect(r).toBeCloseTo(200, 5);
    expect(g).toBeCloseTo(100, 5);
    expect(b).toBeCloseTo(50, 5);
  });

  it("la escala de grises iguala los tres canales", () => {
    const [r, g, b] = adjustColor(200, 100, 50, { ...neutral, grayscale: true });
    expect(r).toBeCloseTo(g, 5);
    expect(g).toBeCloseTo(b, 5);
  });

  it("la temperatura positiva (cálida) sube el rojo y baja el azul", () => {
    const [r, , b] = adjustColor(128, 128, 128, { ...neutral, temperature: 100 });
    expect(r).toBeGreaterThan(128);
    expect(b).toBeLessThan(128);
  });

  it("la temperatura negativa (fría) baja el rojo y sube el azul", () => {
    const [r, , b] = adjustColor(128, 128, 128, { ...neutral, temperature: -100 });
    expect(r).toBeLessThan(128);
    expect(b).toBeGreaterThan(128);
  });

  it("el brillo positivo aclara y el negativo oscurece", () => {
    expect(adjustColor(100, 100, 100, { ...neutral, brightness: 50 })[0]).toBeGreaterThan(100);
    expect(adjustColor(100, 100, 100, { ...neutral, brightness: -50 })[0]).toBeLessThan(100);
  });
});

describe("clampByte", () => {
  it("recorta a [0, 255] y redondea", () => {
    expect(clampByte(-10)).toBe(0);
    expect(clampByte(300)).toBe(255);
    expect(clampByte(127.6)).toBe(128);
  });
});

describe("adjustPixels", () => {
  it("aplica los ajustes a un buffer RGBA y conserva el alfa", () => {
    const data = new Uint8ClampedArray([200, 100, 50, 255, 10, 20, 30, 128]);
    adjustPixels(data, { ...neutral, grayscale: true });
    // Primer píxel: los tres canales iguales.
    expect(data[0]).toBe(data[1]);
    expect(data[1]).toBe(data[2]);
    expect(data[3]).toBe(255);
    // El alfa del segundo píxel se conserva.
    expect(data[7]).toBe(128);
  });
});
