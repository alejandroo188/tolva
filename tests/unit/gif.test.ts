import { describe, expect, it } from "vitest";
import { encodeGif } from "../../src/lib/media/gif";

describe("gif.encodeGif", () => {
  it("produce la firma GIF89a", () => {
    const rgba = new Uint8Array(4 * 4 * 2);
    const out = encodeGif(rgba, 4, 2);
    const header = String.fromCharCode(...out.subarray(0, 6));
    expect(header).toBe("GIF89a");
  });

  it("emite un fichero no vacío con tráiler 3B", () => {
    const rgba = new Uint8Array(4 * 4 * 2);
    const out = encodeGif(rgba, 4, 2);
    expect(out.length).toBeGreaterThan(6);
    expect(out[out.length - 1]).toBe(0x3b); // trailer GIF
  });

  it("lanza RangeError ante dimensiones inválidas", () => {
    expect(() => encodeGif(new Uint8Array(4), 0, 1)).toThrow(RangeError);
    expect(() => encodeGif(new Uint8Array(4), 1, 0)).toThrow(RangeError);
  });
});
