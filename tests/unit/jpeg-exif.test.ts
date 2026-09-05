import { describe, expect, it } from "vitest";
import { hasExifApp1, stripExifApp1 } from "../../src/lib/media/jpeg-exif";

const bytes = (...arr: number[]): Uint8Array => new Uint8Array(arr);
const ab = (...arr: number[]): ArrayBuffer => Uint8Array.from(arr).buffer as ArrayBuffer;

/** Segmento APP1 "Exif\0\0": FF E1, longitud 8 (campo + 6 de firma). */
const EXIF_APP1 = [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
/** Segmento DQT mínimo: FF DB, longitud 4, payload de 2 bytes. */
const DQT = [0xff, 0xdb, 0x00, 0x04, 0x00, 0x01];
const SOI = [0xff, 0xd8];
const EOI = [0xff, 0xd9];

describe("jpeg-exif.hasExifApp1", () => {
  it("detecta un APP1 EXIF tras el SOI", () => {
    expect(hasExifApp1(bytes(...SOI, ...EXIF_APP1, ...EOI))).toBe(true);
  });

  it("detecta EXIF aunque haya otros segmentos antes", () => {
    expect(hasExifApp1(bytes(...SOI, ...DQT, ...EXIF_APP1, ...EOI))).toBe(true);
  });

  it("no detecta EXIF si el APP1 no lleva la firma Exif\\0\\0 (p. ej. XMP)", () => {
    const xmpApp1 = [0xff, 0xe1, 0x00, 0x08, 0x68, 0x74, 0x74, 0x70, 0x3a, 0x2f]; // "http:/"
    expect(hasExifApp1(bytes(...SOI, ...xmpApp1, ...EOI))).toBe(false);
  });

  it("no detecta EXIF en un JPEG sin APP1", () => {
    expect(hasExifApp1(bytes(...SOI, ...DQT, ...EOI))).toBe(false);
  });

  it("no detecta EXIF en un no-JPEG (PNG)", () => {
    const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d);
    expect(hasExifApp1(png)).toBe(false);
  });
});

describe("jpeg-exif.stripExifApp1", () => {
  it("elimina el APP1 EXIF y conserva SOI + EOI", () => {
    const out = stripExifApp1(ab(...SOI, ...EXIF_APP1, ...EOI));
    expect(Array.from(new Uint8Array(out))).toEqual([...SOI, ...EOI]);
  });

  it("conserva los segmentos que no son EXIF", () => {
    const out = stripExifApp1(ab(...SOI, ...DQT, ...EXIF_APP1, ...EOI));
    expect(Array.from(new Uint8Array(out))).toEqual([...SOI, ...DQT, ...EOI]);
  });

  it("devuelve el mismo ArrayBuffer (sin copiar) si no hay EXIF", () => {
    const noExif = ab(...SOI, ...DQT, ...EOI);
    expect(stripExifApp1(noExif)).toBe(noExif);
  });
});
