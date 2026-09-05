import { describe, expect, it } from "vitest";
import {
  changeExtension,
  extensionForFormat,
  limitFilenameLength,
  sanitizeFilename,
  uniqueName,
} from "../../src/lib/domain/filenames";

describe("filenames.extensionForFormat", () => {
  it("mapea formatos a extensión", () => {
    expect(extensionForFormat("jpeg")).toBe("jpg");
    expect(extensionForFormat("png")).toBe("png");
    expect(extensionForFormat("webp")).toBe("webp");
  });

  it("devuelve bin para formatos desconocidos", () => {
    expect(extensionForFormat("tiff" as never)).toBe("bin");
  });
});

describe("filenames.changeExtension", () => {
  it("cambia la extensión", () => {
    expect(changeExtension("foto.png", "webp")).toBe("foto.webp");
    expect(changeExtension("foto.jpeg", "webp")).toBe("foto.webp");
  });

  it("añade extensión si no la hay", () => {
    expect(changeExtension("foto", "webp")).toBe("foto.webp");
  });

  it("usa archivo como base si el nombre está vacío", () => {
    expect(changeExtension("", "webp")).toBe("archivo.webp");
  });
});

describe("filenames.sanitizeFilename", () => {
  it("sustituye caracteres inválidos por _", () => {
    expect(sanitizeFilename("foto: con <chars>?")).toBe("foto_ con _chars__");
  });

  it("recorta espacios y puntos en los extremos", () => {
    expect(sanitizeFilename("  foto.  ")).toBe("foto");
  });

  it("neutraliza nombres reservados", () => {
    expect(sanitizeFilename("CON")).toBe("_CON");
    expect(sanitizeFilename("con.txt")).toBe("_con.txt");
  });

  it("conserva el Unicode", () => {
    expect(sanitizeFilename("café ñ 日本 🎉")).toBe("café ñ 日本 🎉");
  });

  it("sustituye barra y contrabarra", () => {
    expect(sanitizeFilename("a/b\\c")).toBe("a_b_c");
  });

  it("sustituye caracteres de control", () => {
    expect(sanitizeFilename("a\u0000b")).toBe("a_b");
  });

  it("devuelve archivo si queda vacío", () => {
    expect(sanitizeFilename("   ")).toBe("archivo");
    expect(sanitizeFilename("***")).toBe("___");
  });
});

describe("filenames.uniqueName", () => {
  it("devuelve el nombre si no hay colisión", () => {
    expect(uniqueName("foto.jpg", new Set(["otra.jpg"]))).toBe("foto.jpg");
  });

  it("añade sufijo (1) ante colisión", () => {
    expect(uniqueName("foto.jpg", new Set(["foto.jpg"]))).toBe("foto (1).jpg");
  });

  it("incrementa el sufijo hasta encontrar un hueco", () => {
    expect(uniqueName("foto.jpg", new Set(["foto.jpg", "foto (1).jpg", "foto (2).jpg"]))).toBe(
      "foto (3).jpg",
    );
  });

  it("maneja nombres sin extensión", () => {
    expect(uniqueName("foto", new Set(["foto"]))).toBe("foto (1)");
  });
});

describe("filenames.limitFilenameLength", () => {
  it("deja intactos los nombres cortos", () => {
    expect(limitFilenameLength("foto.jpg", 255)).toBe("foto.jpg");
  });

  it("trunca la base conservando la extensión", () => {
    expect(limitFilenameLength("abcdefghij.jpg", 10)).toBe("abcdef.jpg");
  });

  it("clampa la longitud mínima a 1", () => {
    expect(limitFilenameLength("abcdef.jpg", 0).length).toBeLessThanOrEqual(1);
  });

  it("nunca excede la longitud pedida", () => {
    const result = limitFilenameLength("nombre-muy-largo.jpg", 8);
    expect(result.length).toBeLessThanOrEqual(8);
    expect(result.endsWith(".jpg")).toBe(true);
  });
});
