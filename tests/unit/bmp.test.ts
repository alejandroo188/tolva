import { describe, expect, it } from "vitest";
import { decodeBmp, encodeBmp } from "../../src/lib/media/bmp";

function solidRgba(width: number, height: number): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    rgba[i * 4] = (i * 11) % 256;
    rgba[i * 4 + 1] = (i * 7) % 256;
    rgba[i * 4 + 2] = (i * 3) % 256;
    rgba[i * 4 + 3] = (i * 5) % 256;
  }
  return rgba;
}

describe("bmp.encodeBmp", () => {
  it("escribe la firma BM y el offset de datos 54", () => {
    const out = encodeBmp(new Uint8Array(4 * 4 * 2), 4, 2);
    expect(out[0]).toBe(0x42);
    expect(out[1]).toBe(0x4d);
    expect(new DataView(out.buffer).getUint32(10, true)).toBe(54);
  });

  it("codifica 24 bpp por defecto", () => {
    const out = encodeBmp(new Uint8Array(4 * 4 * 2), 4, 2);
    expect(new DataView(out.buffer).getUint16(28, true)).toBe(24);
  });

  it("codifica 32 bpp con alpha", () => {
    const out = encodeBmp(new Uint8Array(4 * 4 * 2), 4, 2, { alpha: true });
    expect(new DataView(out.buffer).getUint16(28, true)).toBe(32);
  });

  it("lanza RangeError ante dimensiones o buffer inválidos", () => {
    expect(() => encodeBmp(new Uint8Array(4), 0, 1)).toThrow(RangeError);
    expect(() => encodeBmp(new Uint8Array(4), 1, 0)).toThrow(RangeError);
    expect(() => encodeBmp(new Uint8Array(1), 1, 1)).toThrow(RangeError);
  });
});

describe("bmp.decodeBmp", () => {
  it("round-trip 24 bpp (alfa forzado a 255)", () => {
    const w = 3;
    const h = 2;
    const src = solidRgba(w, h);
    const decoded = decodeBmp(encodeBmp(src, w, h));
    expect(decoded).not.toBeNull();
    expect(decoded!.width).toBe(w);
    expect(decoded!.height).toBe(h);
    for (let i = 0; i < w * h; i += 1) {
      expect(decoded!.data[i * 4]).toBe(src[i * 4]);
      expect(decoded!.data[i * 4 + 1]).toBe(src[i * 4 + 1]);
      expect(decoded!.data[i * 4 + 2]).toBe(src[i * 4 + 2]);
      expect(decoded!.data[i * 4 + 3]).toBe(255);
    }
  });

  it("round-trip 32 bpp conserva el canal alfa", () => {
    const w = 3;
    const h = 3;
    const src = solidRgba(w, h);
    const decoded = decodeBmp(encodeBmp(src, w, h, { alpha: true }));
    expect(decoded).not.toBeNull();
    expect(Array.from(decoded!.data)).toEqual(Array.from(src));
  });

  it("devuelve null ante una firma inválida", () => {
    expect(decodeBmp(new Uint8Array(54))).toBe(null);
  });

  it("devuelve null ante compresión distinta de BI_RGB", () => {
    const encoded = encodeBmp(solidRgba(2, 2), 2, 2);
    const view = new DataView(encoded.buffer);
    view.setUint32(30, 1, true); // compresión != 0
    expect(decodeBmp(encoded)).toBe(null);
  });
});
