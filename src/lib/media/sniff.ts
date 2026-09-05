/**
 * Detección de formato por **bytes mágicos** (§8.3), no por extensión ni MIME.
 *
 * Puro: opera sobre `Uint8Array`/`ArrayBuffer` y no toca ninguna API del
 * navegador, así que se puede testear en Node y usar tanto en el worker como en
 * el hilo principal.
 */

/** Formatos detectables. Incluye los de sólo lectura (tiff, svg) y de entrada. */
export type DetectedFormat =
  "jpeg" | "png" | "webp" | "avif" | "jxl" | "gif" | "bmp" | "tiff" | "svg";

/** Convierte la entrada a bytes para leerla. Copia si es `ArrayBuffer` compartido. */
function toBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(input);
}

/** Lee los primeros `n` bytes como ASCII para comparar firmas textuales. */
function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = "";
  for (let i = start; i < start + length && i < bytes.length; i += 1) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

/**
 * Devuelve el formato detectado por firma de bytes, o `null` si no lo reconoce.
 *
 * Firmas (ver §8.3):
 * - JPEG `FF D8 FF`
 * - PNG `89 50 4E 47 0D 0A 1A 0A`
 * - WebP `RIFF` + `WEBP` en 8
 * - AVIF `ftypavif`/`ftypavis` en 4
 * - JPEG XL `FF 0A` o `00 00 00 0C 4A 58 4C 20`
 * - GIF `GIF87a`/`GIF89a`
 * - BMP `42 4D`
 * - TIFF `II*\0` / `MM\0*`
 * - SVG `<svg` o `<?xml` (texto)
 */
export function detectFormat(input: ArrayBuffer | Uint8Array): DetectedFormat | null {
  const b = toBytes(input);
  if (b.length < 4) return null;

  // JPEG
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";

  // PNG
  if (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return "png";
  }

  // WebP: "RIFF" + tamaño + "WEBP"
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    ascii(b, 8, 4) === "WEBP"
  ) {
    return "webp";
  }

  // AVIF/AVIS/HEIF: bytes 4..8 == "ftyp", 8..12 == "avif" | "avis"
  if (b.length >= 12 && ascii(b, 4, 4) === "ftyp") {
    const brand = ascii(b, 8, 4);
    if (brand === "avif" || brand === "avis") return "avif";
  }

  // JPEG XL: contenedor "FF 0A", o el contenedor ISO-BMFF "00 00 00 0C JXL "
  const isJxlCodestream = b[0] === 0xff && b[1] === 0x0a;
  const isJxlContainer =
    b.length >= 12 &&
    b[0] === 0x00 &&
    b[1] === 0x00 &&
    b[2] === 0x00 &&
    b[3] === 0x0c &&
    b[4] === 0x4a &&
    b[5] === 0x58 &&
    b[6] === 0x4c &&
    b[7] === 0x20;
  if (isJxlCodestream || isJxlContainer) return "jxl";

  // GIF
  if (ascii(b, 0, 6) === "GIF87a" || ascii(b, 0, 6) === "GIF89a") return "gif";

  // BMP
  if (b[0] === 0x42 && b[1] === 0x4d) return "bmp";

  // TIFF: "II*\0" (LE) o "MM\0*" (BE)
  if (b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) return "tiff";
  if (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a) return "tiff";

  // SVG: texto XML. Puede tener BOM o whitespace delante.
  const head = ascii(b, 0, Math.min(256, b.length)).trimStart();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) return "svg";

  return null;
}

/** ¿Es el formato decodificable de forma nativa por `createImageBitmap`? */
export function isNativeBitmapFormat(format: DetectedFormat): boolean {
  return format === "jpeg" || format === "png" || format === "webp";
}

/** MIME canónico de un formato detectado (para crear `Blob`/decodificar). */
export function mimeForFormat(format: DetectedFormat): string {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "jxl":
      return "image/jxl";
    case "gif":
      return "image/gif";
    case "bmp":
      return "image/bmp";
    case "tiff":
      return "image/tiff";
    case "svg":
      return "image/svg+xml";
  }
}
