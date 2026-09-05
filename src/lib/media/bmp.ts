/**
 * Codificador y decodificador BMP sin comprimir (BITMAPINFOHEADER + BI_RGB).
 *
 * Puro (no usa canvas): opera sobre `Uint8Array`. Se usa en el worker para
 * producir la salida BMP y leer BMP de entrada, y es testeable en Node (§8.3
 * firma `42 4D`).
 *
 * Soporte de **codificación**: 24 bpp (BGR, sin alfa) y 32 bpp (BGRA, con alfa).
 * Soporte de **decodificación**: 24/32 bpp sin comprimir y 8 bpp con paleta.
 */

export interface BmpImage {
  width: number;
  height: number;
  /** RGBA, `width*height*4`. */
  data: Uint8ClampedArray;
}

export interface BmpEncodeOptions {
  /** Si es `true` escribe 32 bpp con canal alfa; si no, 24 bpp sin alfa. */
  alpha?: boolean;
}

/** Escribe un entero little-endian sin signo de `bits` bits en `view` a `offset`. */
function writeUint(view: DataView, offset: number, value: number, bits: 8 | 16 | 32): void {
  if (bits === 8) view.setUint8(offset, value & 0xff);
  else if (bits === 16) view.setUint16(offset, value & 0xffff, true);
  else view.setUint32(offset, value >>> 0, true);
}

function writeInt(view: DataView, offset: number, value: number): void {
  view.setInt32(offset, value, true);
}

/**
 * Codifica RGBA a un BMP sin comprimir (filas de abajo a arriba, relleno a
 * múltiplos de 4 bytes). Lanza `RangeError` ante dimensiones inválidas.
 */
export function encodeBmp(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  options: BmpEncodeOptions = {},
): Uint8Array {
  const alpha = options.alpha ?? false;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError("BMP: width y height deben ser enteros positivos");
  }
  if (rgba.length < width * height * 4) {
    throw new RangeError("BMP: el buffer RGBA no cubre width*height*4");
  }

  const bpp = alpha ? 32 : 24;
  const bytesPerPixel = bpp / 8;
  const rowSize = Math.floor((bpp * width + 31) / 32) * 4; // fila rellena a 4 bytes
  const pixelDataSize = rowSize * height;
  const dataOffset = 14 + 40; // cabecera de fichero + BITMAPINFOHEADER
  const fileSize = dataOffset + pixelDataSize;

  const out = new Uint8Array(fileSize);
  const view = new DataView(out.buffer);

  // Cabecera de fichero
  out[0] = 0x42; // 'B'
  out[1] = 0x4d; // 'M'
  writeUint(view, 2, fileSize, 32);
  writeUint(view, 6, 0, 16); // reservado
  writeUint(view, 8, 0, 16); // reservado
  writeUint(view, 10, dataOffset, 32);

  // BITMAPINFOHEADER
  writeUint(view, 14, 40, 32); // tamaño de la cabecera
  writeInt(view, 18, width);
  writeInt(view, 22, height); // positivo = bottom-up
  writeUint(view, 26, 1, 16); // planos
  writeUint(view, 28, bpp, 16);
  writeUint(view, 30, 0, 32); // BI_RGB
  writeUint(view, 34, pixelDataSize, 32);
  writeUint(view, 38, 2835, 32); // ~72 DPI
  writeUint(view, 42, 2835, 32);
  writeUint(view, 46, 0, 32); // colores usados
  writeUint(view, 50, 0, 32); // colores importantes

  // Píxeles, filas de abajo a arriba.
  for (let y = 0; y < height; y += 1) {
    const srcRow = (height - 1 - y) * width * 4;
    const dstRow = dataOffset + y * rowSize;
    for (let x = 0; x < width; x += 1) {
      const s = srcRow + x * 4;
      const d = dstRow + x * bytesPerPixel;
      out[d] = rgba[s + 2]; // B
      out[d + 1] = rgba[s + 1]; // G
      out[d + 2] = rgba[s]; // R
      if (alpha) out[d + 3] = rgba[s + 3]; // A
    }
  }

  return out;
}

/**
 * Decodifica un BMP sin comprimir (24/32 bpp BI_RGB y 8 bpp con paleta).
 * Devuelve `null` si la firma o la cabecera no son válidas.
 */
export function decodeBmp(bytes: ArrayBuffer | Uint8Array): BmpImage | null {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length < 54 || b[0] !== 0x42 || b[1] !== 0x4d) return null;

  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const dataOffset = view.getUint32(10, true);
  const headerSize = view.getUint32(14, true);
  if (headerSize < 40) return null;

  const width = view.getInt32(18, true);
  const rawHeight = view.getInt32(22, true);
  const bottomUp = rawHeight > 0;
  const height = Math.abs(rawHeight);
  const bpp = view.getUint16(28, true);
  const compression = view.getUint32(30, true);
  if (width <= 0 || height <= 0) return null;

  // Sólo soportamos BI_RGB (sin comprimir) y 8/24/32 bpp.
  if (compression !== 0) return null;

  const data = new Uint8ClampedArray(width * height * 4);

  if (bpp === 8) {
    // Paleta de 256 entradas BGRA justo tras la cabecera DIB.
    const paletteStart = 14 + headerSize;
    if (b.length < paletteStart + 256 * 4) return null;
    const palette = new Uint8Array(256 * 4);
    for (let i = 0; i < 256 * 4; i += 1) palette[i] = b[paletteStart + i];

    const rowSize = Math.floor((8 * width + 31) / 32) * 4;
    for (let y = 0; y < height; y += 1) {
      const srcRow = dataOffset + y * rowSize;
      const dstRow = (bottomUp ? height - 1 - y : y) * width * 4;
      for (let x = 0; x < width; x += 1) {
        const idx = b[srcRow + x];
        const p = idx * 4;
        const d = dstRow + x * 4;
        data[d] = palette[p + 2]; // R
        data[d + 1] = palette[p + 1]; // G
        data[d + 2] = palette[p]; // B
        data[d + 3] = 255;
      }
    }
    return { width, height, data };
  }

  if (bpp === 24 || bpp === 32) {
    const bytesPerPixel = bpp / 8;
    const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
    for (let y = 0; y < height; y += 1) {
      const srcRow = dataOffset + y * rowSize;
      const dstRow = (bottomUp ? height - 1 - y : y) * width * 4;
      for (let x = 0; x < width; x += 1) {
        const s = srcRow + x * bytesPerPixel;
        const d = dstRow + x * 4;
        data[d] = b[s + 2]; // R
        data[d + 1] = b[s + 1]; // G
        data[d + 2] = b[s]; // B
        data[d + 3] = bpp === 32 ? b[s + 3] : 255; // A
      }
    }
    return { width, height, data };
  }

  return null;
}
