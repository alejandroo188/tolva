import { describe, expect, it } from "vitest";
import type { Op, Rect } from "../../src/lib/domain/types";
import {
  getAdjust,
  getCrop,
  getFlips,
  getResize,
  getRotation,
  getStraighten,
  getWatermark,
  hasOps,
  setAdjust,
  setCrop,
  setFlips,
  setResize,
  setRotation,
  setStraighten,
  setWatermark,
  toggleFlip,
} from "../../src/lib/image/draft";

const frame: Rect = { x: 10, y: 20, width: 100, height: 80 };

describe("draft: recorte", () => {
  it("lee null sin recorte y el recorte cuando existe", () => {
    expect(getCrop([])).toBeNull();
    expect(getCrop(setCrop([], frame))).toEqual(frame);
  });

  it("sustituye y elimina el recorte", () => {
    const ops = setCrop([], frame);
    const changed = setCrop(ops, { x: 0, y: 0, width: 50, height: 50 });
    expect(getCrop(changed)).toEqual({ x: 0, y: 0, width: 50, height: 50 });
    expect(getCrop(setCrop(changed, null))).toBeNull();
  });
});

describe("draft: rotación y enderezado", () => {
  it("rota 90/180/270 y vuelve a 0", () => {
    expect(getRotation(setRotation([], 90))).toBe(90);
    expect(getRotation(setRotation(setRotation([], 90), 270))).toBe(270);
    expect(getRotation(setRotation(setRotation([], 180), 0))).toBe(0);
  });

  it("redondea el enderezado a 1 decimal y elimina el 0", () => {
    expect(getStraighten(setStraighten([], 4.56))).toBe(4.6);
    expect(getStraighten(setStraighten([], 0))).toBe(0);
    expect(getStraighten(setStraighten(setStraighten([], 5), 0))).toBe(0);
  });
});

describe("draft: volteos", () => {
  it("alterna un eje conservando el otro", () => {
    let ops: Op[] = toggleFlip([], "horizontal");
    expect(getFlips(ops)).toEqual({ horizontal: true, vertical: false });
    ops = toggleFlip(ops, "vertical");
    expect(getFlips(ops)).toEqual({ horizontal: true, vertical: true });
    ops = toggleFlip(ops, "horizontal");
    expect(getFlips(ops)).toEqual({ horizontal: false, vertical: true });
  });

  it("setFlips reemplaza ambos ejes", () => {
    expect(getFlips(setFlips([], true, true))).toEqual({ horizontal: true, vertical: true });
    expect(getFlips(setFlips(setFlips([], true, true), false, false))).toEqual({
      horizontal: false,
      vertical: false,
    });
  });
});

describe("draft: ajustes", () => {
  it("empieza neutro y guarda un cambio parcial", () => {
    expect(getAdjust([])).toEqual({
      type: "adjust",
      brightness: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
      grayscale: false,
    });
    const ops = setAdjust([], { brightness: 40, grayscale: true });
    expect(getAdjust(ops).brightness).toBe(40);
    expect(getAdjust(ops).contrast).toBe(0);
    expect(getAdjust(ops).grayscale).toBe(true);
  });

  it("elimina la operación cuando todo vuelve a neutro", () => {
    const ops = setAdjust([], { contrast: 30 });
    expect(hasOps(ops)).toBe(true);
    expect(hasOps(setAdjust(ops, { contrast: 0 }))).toBe(false);
  });
});

describe("draft: redimensionado", () => {
  it("lee null sin resize y el resize cuando existe", () => {
    expect(getResize([])).toBeNull();
    const resize = {
      type: "resize" as const,
      width: 400,
      height: 300,
      mode: "fit" as const,
      upscale: false,
    };
    expect(getResize(setResize([], resize))).toEqual(resize);
  });

  it("sustituye y elimina el redimensionado", () => {
    const ops = setResize([], {
      type: "resize",
      width: 100,
      height: 100,
      mode: "fill",
      upscale: true,
    });
    const changed = setResize(ops, {
      type: "resize",
      width: 200,
      height: 200,
      mode: "fit",
      upscale: false,
    });
    expect(getResize(changed)?.width).toBe(200);
    expect(getResize(setResize(changed, null))).toBeNull();
  });
});

describe("draft: marca de agua", () => {
  const wm = {
    type: "watermark" as const,
    kind: "text" as const,
    text: "Tolva",
    opacity: 0.6,
    position: "se" as const,
  };

  it("pone y quita la marca", () => {
    const ops = setWatermark([], wm);
    expect(getWatermark(ops)).toEqual(wm);
    expect(getWatermark(setWatermark(ops, null))).toBeNull();
  });
});

describe("draft: composición", () => {
  it("las operaciones se ordenan al orden canónico", () => {
    let ops: Op[] = setAdjust([], { brightness: 10 });
    ops = setCrop(ops, frame);
    ops = setRotation(ops, 90);
    ops = setStraighten(ops, 2);
    ops = setFlips(ops, true, false);
    const order = ops.map((o) => o.type);
    expect(order).toEqual(["crop", "rotate", "straighten", "flip", "adjust"]);
  });
});
