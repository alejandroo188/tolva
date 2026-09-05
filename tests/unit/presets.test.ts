import { describe, expect, it } from "vitest";
import { parseSocialPresets, parseVideoPresets } from "../../src/lib/domain/presets";
import socialPresetsJson from "../../src/config/social-presets.json";
import videoPresetsJson from "../../src/config/video-presets.json";

describe("presets.parseSocialPresets", () => {
  it("valida un array correcto", () => {
    const input = [{ id: "avatar", label: "Avatar", ratio: { w: 1, h: 1 } }];
    expect(parseSocialPresets(input)).toEqual([
      { id: "avatar", label: "Avatar", ratio: { w: 1, h: 1 } },
    ]);
  });

  it("rechaza entradas que no son array", () => {
    expect(() => parseSocialPresets("no")).toThrow(/array/);
  });

  it("rechaza id/label/ratio inválidos", () => {
    expect(() => parseSocialPresets([{ id: "", label: "x", ratio: { w: 1, h: 1 } }])).toThrow(/id/);
    expect(() => parseSocialPresets([{ id: "a", label: "", ratio: { w: 1, h: 1 } }])).toThrow(
      /label/,
    );
    expect(() => parseSocialPresets([{ id: "a", label: "x", ratio: { w: 0, h: 1 } }])).toThrow(
      /ratio/,
    );
  });

  it("rechaza elementos que no son objeto", () => {
    expect(() => parseSocialPresets([42])).toThrow(/objeto/);
    expect(() => parseSocialPresets(["avatar"])).toThrow(/objeto/);
  });

  it("rechaza ids duplicados", () => {
    const dup = [
      { id: "a", label: "x", ratio: { w: 1, h: 1 } },
      { id: "a", label: "y", ratio: { w: 1, h: 1 } },
    ];
    expect(() => parseSocialPresets(dup)).toThrow(/duplicado/);
  });
});

describe("presets.parseVideoPresets", () => {
  const valid = [
    {
      id: "720p",
      label: "720p",
      width: 1280,
      height: 720,
      fps: 30,
      videoBitrate: 2500000,
      audioBitrate: 128000,
    },
  ];

  it("valida un array correcto", () => {
    expect(parseVideoPresets(valid)[0].id).toBe("720p");
  });

  it("rechaza entradas que no son array", () => {
    expect(() => parseVideoPresets(null)).toThrow(/array/);
  });

  it("rechaza elementos que no son objeto", () => {
    expect(() => parseVideoPresets([42])).toThrow(/objeto/);
    expect(() => parseVideoPresets(["720p"])).toThrow(/objeto/);
  });

  it("rechaza dimensiones/fps inválidos", () => {
    expect(() => parseVideoPresets([{ ...valid[0], width: 0 }])).toThrow(/width/);
    expect(() => parseVideoPresets([{ ...valid[0], fps: -1 }])).toThrow(/fps/);
  });

  it("rechaza bitrates inválidos", () => {
    expect(() => parseVideoPresets([{ ...valid[0], videoBitrate: 0 }])).toThrow(/videoBitrate/);
    expect(() => parseVideoPresets([{ ...valid[0], audioBitrate: 0 }])).toThrow(/audioBitrate/);
  });
});

describe("presets — ficheros reales", () => {
  it("social-presets.json valida y cubre los presets obligatorios", () => {
    const presets = parseSocialPresets(socialPresetsJson);
    const ids = new Set(presets.map((p) => p.id));
    for (const required of ["avatar", "historia", "post", "post-4-5", "portada", "miniatura"]) {
      expect(ids.has(required)).toBe(true);
    }
  });

  it("la historia es 9:16 y la miniatura 16:9", () => {
    const presets = parseSocialPresets(socialPresetsJson);
    const historia = presets.find((p) => p.id === "historia");
    const miniatura = presets.find((p) => p.id === "miniatura");
    expect(historia?.ratio).toEqual({ w: 9, h: 16 });
    expect(miniatura?.ratio).toEqual({ w: 16, h: 9 });
  });

  it("video-presets.json valida", () => {
    const presets = parseVideoPresets(videoPresetsJson);
    expect(presets.length).toBeGreaterThan(0);
    for (const p of presets) {
      expect(p.width).toBeGreaterThan(0);
      expect(p.fps).toBeGreaterThan(0);
    }
  });
});
