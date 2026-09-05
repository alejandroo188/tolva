import { describe, expect, it } from "vitest";
import { formatBytes, formatSavings, savingsPercent } from "../../src/lib/domain/bytes";

describe("bytes.formatBytes", () => {
  it("formatea bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("formatea con coma decimal en es-ES", () => {
    expect(formatBytes(1536)).toBe("1,5 KB");
    expect(formatBytes(2000000)).toBe("1,9 MB");
  });

  it("trata valores no positivos o no finitos como 0 B", () => {
    expect(formatBytes(-5)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("0 B");
  });

  it("asciende por las unidades", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
  });
});

describe("bytes.savingsPercent", () => {
  it("calcula ahorro positivo cuando adelgaza", () => {
    expect(savingsPercent(100, 6)).toBeCloseTo(94);
  });

  it("calcula ahorro negativo cuando engorda (sin disfrazarlo)", () => {
    expect(savingsPercent(100, 110)).toBeCloseTo(-10);
  });

  it("devuelve NaN cuando no se puede calcular", () => {
    expect(savingsPercent(0, 50)).toBeNaN();
    expect(savingsPercent(Number.NaN, 50)).toBeNaN();
    expect(savingsPercent(100, Number.NaN)).toBeNaN();
  });
});

describe("bytes.formatSavings", () => {
  it("formatea ahorro positivo", () => {
    expect(formatSavings(94)).toBe("94 %");
    expect(formatSavings(33.3)).toBe("33,3 %");
  });

  it("formatea ahorro negativo con su signo", () => {
    expect(formatSavings(-12.3)).toBe("-12,3 %");
  });

  it("muestra 0 % cerca del cero", () => {
    expect(formatSavings(0)).toBe("0 %");
    expect(formatSavings(0.01)).toBe("0 %");
  });

  it("muestra una raya ante valores no finitos", () => {
    expect(formatSavings(Number.NaN)).toBe("—");
  });
});
