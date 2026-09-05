import { describe, expect, it } from "vitest";
import { chooseAlgorithm, planReductionSteps } from "../../src/lib/domain/resize";

describe("resize.chooseAlgorithm", () => {
  it("elige lanczos3 al reducir", () => {
    expect(chooseAlgorithm(0.5)).toBe("lanczos3");
    expect(chooseAlgorithm(0.99)).toBe("lanczos3");
  });

  it("elige bilinear al ampliar", () => {
    expect(chooseAlgorithm(1.01)).toBe("bilinear");
    expect(chooseAlgorithm(2)).toBe("bilinear");
  });

  it("elige none a escala 1:1", () => {
    expect(chooseAlgorithm(1)).toBe("none");
  });

  it("elige none ante escala inválida", () => {
    expect(chooseAlgorithm(0)).toBe("none");
    expect(chooseAlgorithm(-1)).toBe("none");
    expect(chooseAlgorithm(Number.NaN)).toBe("none");
  });
});

describe("resize.planReductionSteps", () => {
  it("devuelve [] ante dimensiones inválidas", () => {
    expect(planReductionSteps({ width: 0, height: 100 }, { width: 50, height: 50 })).toEqual([]);
    expect(planReductionSteps({ width: 100, height: 100 }, { width: 0, height: 50 })).toEqual([]);
  });

  it("un solo paso para reducciones suaves (factor ≥ 0.5)", () => {
    expect(planReductionSteps({ width: 100, height: 100 }, { width: 80, height: 80 })).toEqual([
      { width: 80, height: 80 },
    ]);
  });

  it("encadena mitades para reducciones grandes", () => {
    expect(planReductionSteps({ width: 1000, height: 1000 }, { width: 100, height: 100 })).toEqual([
      { width: 500, height: 500 },
      { width: 250, height: 250 },
      { width: 125, height: 125 },
      { width: 100, height: 100 },
    ]);
  });

  it("no duplica el destino si una mitad coincide exactamente", () => {
    expect(planReductionSteps({ width: 800, height: 800 }, { width: 200, height: 200 })).toEqual([
      { width: 400, height: 400 },
      { width: 200, height: 200 },
    ]);
  });

  it("respeta el mínimo de 1 px en los pasos", () => {
    const steps = planReductionSteps({ width: 4, height: 4 }, { width: 1, height: 1 });
    expect(steps.at(-1)).toEqual({ width: 1, height: 1 });
    for (const step of steps) {
      expect(step.width).toBeGreaterThanOrEqual(1);
      expect(step.height).toBeGreaterThanOrEqual(1);
    }
  });
});
