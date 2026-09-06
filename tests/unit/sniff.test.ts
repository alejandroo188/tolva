import { describe, expect, it } from "vitest";
import {
  detectFormat,
  hasJpegEndOfImage,
  isNativeBitmapFormat,
  mimeForFormat,
} from "../../src/lib/media/sniff";

const bytes = (...arr: number[]): Uint8Array => new Uint8Array(arr);

describe("sniff.detectFormat", () => {
  it("detecta JPEG (FF D8 FF)", () => {
    expect(detectFormat(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
  });

  it("detecta PNG por su firma completa de 8 bytes", () => {
    expect(detectFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
  });

  it("detecta WebP (RIFF + WEBP)", () => {
    const b = bytes(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50);
    expect(detectFormat(b)).toBe("webp");
  });

  it("detecta AVIF (ftyp + avif/avis)", () => {
    const avif = bytes(0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66);
    const avis = bytes(0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x73);
    expect(detectFormat(avif)).toBe("avif");
    expect(detectFormat(avis)).toBe("avif");
  });

  it("detecta JPEG XL (codestream FF 0A y contenedor JXL )", () => {
    expect(detectFormat(bytes(0xff, 0x0a, 0x00, 0x00))).toBe("jxl");
    expect(
      detectFormat(bytes(0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a)),
    ).toBe("jxl");
  });

  it("detecta GIF87a y GIF89a", () => {
    expect(detectFormat(bytes(0x47, 0x49, 0x46, 0x38, 0x37, 0x61))).toBe("gif");
    expect(detectFormat(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe("gif");
  });

  it("detecta BMP (42 4D)", () => {
    expect(detectFormat(bytes(0x42, 0x4d, 0x00, 0x00))).toBe("bmp");
  });

  it("detecta TIFF little-endian y big-endian", () => {
    expect(detectFormat(bytes(0x49, 0x49, 0x2a, 0x00))).toBe("tiff");
    expect(detectFormat(bytes(0x4d, 0x4d, 0x00, 0x2a))).toBe("tiff");
  });

  it("detecta SVG (con o sin declaración XML)", () => {
    const enc = new TextEncoder();
    expect(detectFormat(enc.encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe("svg");
    expect(detectFormat(enc.encode('<?xml version="1.0"?><svg></svg>'))).toBe("svg");
  });

  it("devuelve null ante contenido desconocido", () => {
    expect(detectFormat(bytes(0x00, 0x01, 0x02, 0x03))).toBe(null);
  });
});

describe("sniff.isNativeBitmapFormat", () => {
  it("sólo jpeg/png/webp se decodifican con createImageBitmap", () => {
    expect(isNativeBitmapFormat("jpeg")).toBe(true);
    expect(isNativeBitmapFormat("png")).toBe(true);
    expect(isNativeBitmapFormat("webp")).toBe(true);
    expect(isNativeBitmapFormat("gif")).toBe(false);
    expect(isNativeBitmapFormat("avif")).toBe(false);
    expect(isNativeBitmapFormat("tiff")).toBe(false);
  });
});

describe("sniff.mimeForFormat", () => {
  it("mapea cada formato a su MIME canónico", () => {
    expect(mimeForFormat("jpeg")).toBe("image/jpeg");
    expect(mimeForFormat("png")).toBe("image/png");
    expect(mimeForFormat("webp")).toBe("image/webp");
    expect(mimeForFormat("avif")).toBe("image/avif");
    expect(mimeForFormat("jxl")).toBe("image/jxl");
    expect(mimeForFormat("gif")).toBe("image/gif");
    expect(mimeForFormat("bmp")).toBe("image/bmp");
    expect(mimeForFormat("tiff")).toBe("image/tiff");
    expect(mimeForFormat("svg")).toBe("image/svg+xml");
  });
});

describe("sniff.hasJpegEndOfImage", () => {
  it("acepta un JPEG que termina en FF D9", () => {
    expect(hasJpegEndOfImage(bytes(0xff, 0xd8, 0xff, 0xe0, 0x12, 0x34, 0xff, 0xd9))).toBe(true);
  });

  it("acepta un JPEG con relleno después del marcador de fin", () => {
    expect(
      hasJpegEndOfImage(bytes(0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9, 0x00, 0x00, 0x00, 0x00)),
    ).toBe(true);
  });

  it("rechaza un JPEG truncado a mitad de los datos entrópicos", () => {
    // `FF 00` es el relleno de un `FF` literal dentro del scan: no es un marcador.
    expect(hasJpegEndOfImage(bytes(0xff, 0xd8, 0xff, 0xda, 0x12, 0xff, 0x00, 0x34))).toBe(false);
  });

  it("rechaza una entrada vacía o demasiado corta", () => {
    expect(hasJpegEndOfImage(new Uint8Array(0))).toBe(false);
    expect(hasJpegEndOfImage(bytes(0xff))).toBe(false);
  });
});
