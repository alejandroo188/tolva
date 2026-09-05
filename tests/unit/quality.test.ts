import { describe, expect, it } from "vitest";
import {
  clampQuality,
  encoderQuality,
  isLosslessFormat,
  isOutputFormat,
  OUTPUT_FORMATS,
  pngCompressionLevel,
  scaleBitrateForQuality,
  videoParamsForPreset,
} from "../../src/lib/domain/quality";

describe("quality.isOutputFormat / OUTPUT_FORMATS", () => {
  it("reconoce formatos válidos", () => {
    expect(isOutputFormat("jpeg")).toBe(true);
    expect(isOutputFormat("webp")).toBe(true);
    expect(isOutputFormat("bmp")).toBe(true);
  });

  it("rechaza formatos inválidos y no-string", () => {
    expect(isOutputFormat("tiff")).toBe(false);
    expect(isOutputFormat(123)).toBe(false);
    expect(isOutputFormat(null)).toBe(false);
  });

  it("lista los siete formatos de salida", () => {
    expect(OUTPUT_FORMATS).toEqual(["jpeg", "png", "webp", "avif", "jxl", "gif", "bmp"]);
  });
});

describe("quality.isLosslessFormat", () => {
  it("png y bmp son sin pérdida", () => {
    expect(isLosslessFormat("png")).toBe(true);
    expect(isLosslessFormat("bmp")).toBe(true);
  });

  it("jpeg/webp/avif/jxl/gif tienen pérdida", () => {
    expect(isLosslessFormat("jpeg")).toBe(false);
    expect(isLosslessFormat("webp")).toBe(false);
    expect(isLosslessFormat("avif")).toBe(false);
    expect(isLosslessFormat("jxl")).toBe(false);
    expect(isLosslessFormat("gif")).toBe(false);
  });
});

describe("quality.clampQuality", () => {
  it("clampa al rango 0..100 y redondea", () => {
    expect(clampQuality(-5)).toBe(0);
    expect(clampQuality(150)).toBe(100);
    expect(clampQuality(50.6)).toBe(51);
    expect(clampQuality(50)).toBe(50);
  });

  it("devuelve 80 ante valores no numéricos", () => {
    expect(clampQuality(Number.NaN)).toBe(80);
  });
});

describe("quality.encoderQuality", () => {
  it("fuerza mínimo 1 en formatos con pérdida", () => {
    expect(encoderQuality("jpeg", 0)).toBe(1);
    expect(encoderQuality("webp", 80)).toBe(80);
  });

  it("no altera la calidad en formatos sin pérdida", () => {
    expect(encoderQuality("png", 0)).toBe(0);
    expect(encoderQuality("bmp", 80)).toBe(80);
  });
});

describe("quality.pngCompressionLevel", () => {
  it("mapea calidad a nivel 0..9", () => {
    expect(pngCompressionLevel(0)).toBe(0);
    expect(pngCompressionLevel(100)).toBe(9);
    expect(pngCompressionLevel(50)).toBe(5);
  });
});

describe("quality.videoParamsForPreset", () => {
  it("traduce un preset a parámetros redondeados", () => {
    const preset = {
      id: "720p",
      label: "720p",
      width: 1280,
      height: 720,
      fps: 30,
      videoBitrate: 2500000,
      audioBitrate: 128000,
    };
    expect(videoParamsForPreset(preset)).toEqual({
      width: 1280,
      height: 720,
      fps: 30,
      videoBitrate: 2500000,
      audioBitrate: 128000,
    });
  });

  it("sanea valores no enteros", () => {
    const preset = {
      id: "x",
      label: "x",
      width: 1279.6,
      height: 719.4,
      fps: 29.5,
      videoBitrate: 2499999.6,
      audioBitrate: 127999.4,
    };
    const params = videoParamsForPreset(preset);
    expect(params.width).toBe(1280);
    expect(params.height).toBe(719);
    expect(params.videoBitrate).toBe(2500000);
  });
});

describe("quality.scaleBitrateForQuality", () => {
  it("escala el bitrate según la calidad", () => {
    expect(scaleBitrateForQuality(2500000, 100)).toBe(2500000);
    expect(scaleBitrateForQuality(2500000, 50)).toBe(1250000);
    expect(scaleBitrateForQuality(2500000, 0)).toBe(1);
  });

  it("devuelve 1 ante bitrate inválido", () => {
    expect(scaleBitrateForQuality(0, 80)).toBe(1);
    expect(scaleBitrateForQuality(Number.NaN, 80)).toBe(1);
  });
});
