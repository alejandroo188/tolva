import { describe, expect, it } from "vitest";
import { detectCapabilities, type DetectionGlobals } from "../../src/lib/capabilities/index";

const fullGlobals: DetectionGlobals = {
  OffscreenCanvas: {},
  VideoEncoder: {},
  VideoDecoder: {},
  AudioEncoder: {},
  AudioDecoder: {},
  ImageDecoder: {},
  SharedArrayBuffer: {},
  WebAssembly: {},
  WebGLRenderingContext: {},
  WebGL2RenderingContext: {},
  isConfigSupported: async () => true,
  encodeImage: async (type: string) => ({ type }),
  hardwareConcurrency: 8,
};

function has(caps: Awaited<ReturnType<typeof detectCapabilities>>, feature: string): boolean {
  return caps.degradations.some((d) => d.feature === feature);
}

describe("capabilities.detectCapabilities", () => {
  it("detecta un entorno completo sin degradaciones", async () => {
    const caps = await detectCapabilities(fullGlobals);
    expect(caps.image.offscreenCanvas).toBe(true);
    expect(caps.image.webgl2).toBe(true);
    expect(caps.video.webCodecs).toBe(true);
    expect(caps.video.codecs).toHaveLength(3);
    expect(caps.image.webpEncode).toBe(true);
    expect(caps.sharedArrayBuffer).toBe(true);
    expect(caps.wasm).toBe(true);
    expect(caps.hardwareConcurrency).toBe(8);
    expect(caps.degradations).toEqual([]);
  });

  it("sin OffscreenCanvas produce un mensaje de degradación concreto", async () => {
    const caps = await detectCapabilities({ ...fullGlobals, OffscreenCanvas: undefined });
    expect(caps.image.offscreenCanvas).toBe(false);
    expect(has(caps, "offscreenCanvas")).toBe(true);
    const d = caps.degradations.find((x) => x.feature === "offscreenCanvas");
    expect(d?.message.length).toBeGreaterThan(10);
  });

  it("sin VideoEncoder produce degradación de WebCodecs", async () => {
    const caps = await detectCapabilities({ ...fullGlobals, VideoEncoder: undefined });
    expect(caps.video.webCodecs).toBe(false);
    expect(has(caps, "webCodecs")).toBe(true);
  });

  it("isConfigSupported devolviendo false produce degradación de códec", async () => {
    const caps = await detectCapabilities({ ...fullGlobals, isConfigSupported: async () => false });
    expect(caps.video.codecs).toEqual([]);
    expect(has(caps, "videoCodec")).toBe(true);
  });

  it("encodeImage devolviendo PNG al pedir WebP produce degradación de webpEncode", async () => {
    const caps = await detectCapabilities({
      ...fullGlobals,
      encodeImage: async () => ({ type: "image/png" }),
    });
    expect(caps.image.webpEncode).toBe(false);
    const d = caps.degradations.find((x) => x.feature === "webpEncode");
    expect(d?.message).toContain("image/png");
  });

  it("sin SharedArrayBuffer produce degradación", async () => {
    const caps = await detectCapabilities({ ...fullGlobals, SharedArrayBuffer: undefined });
    expect(caps.sharedArrayBuffer).toBe(false);
    expect(has(caps, "sharedArrayBuffer")).toBe(true);
  });

  it("sin globals no lanza y devuelve degradaciones", async () => {
    const caps = await detectCapabilities({});
    expect(caps.hardwareConcurrency).toBe(1);
    expect(has(caps, "offscreenCanvas")).toBe(true);
    expect(has(caps, "webCodecs")).toBe(true);
    expect(has(caps, "wasm")).toBe(true);
  });

  it("nunca lanza aunque isConfigSupported o encodeImage fallen", async () => {
    const caps = await detectCapabilities({
      ...fullGlobals,
      isConfigSupported: async () => {
        throw new Error("boom");
      },
      encodeImage: async () => {
        throw new Error("boom");
      },
    });
    expect(caps.video.codecs).toEqual([]);
    expect(caps.image.webpEncode).toBe(false);
    expect(has(caps, "webpEncode")).toBe(true);
  });

  it("sanea hardwareConcurrency no positivo", async () => {
    const caps = await detectCapabilities({ ...fullGlobals, hardwareConcurrency: 0 });
    expect(caps.hardwareConcurrency).toBe(1);
  });
});
