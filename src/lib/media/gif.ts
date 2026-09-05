/**
 * Codificación GIF de un único fotograma con `gifenc` (paleta cuantizada).
 *
 * Puro en el sentido de que opera sobre `Uint8Array` (no canvas), así que es
 * testeable en Node. En el worker se usa para producir la salida GIF desde un
 * `ImageData`; en el generador de fixtures se usa la misma librería vía CJS.
 */

import { GIFEncoder, quantize, applyPalette } from "gifenc";

/**
 * Codifica una imagen RGBA a un GIF de un fotograma (GIF89a). Devuelve los
 * bytes completos del fichero. Lanza si las dimensiones son inválidas.
 */
export function encodeGif(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  options: { maxColors?: number; delay?: number } = {},
): Uint8Array {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError("GIF: width y height deben ser enteros positivos");
  }
  const maxColors = Math.max(2, Math.min(256, options.maxColors ?? 256));
  const palette = quantize(rgba as Uint8Array, maxColors);
  const index = applyPalette(rgba as Uint8Array, palette);
  const encoder = GIFEncoder();
  encoder.writeFrame(index, width, height, { palette, delay: options.delay ?? 0 });
  encoder.finish();
  return encoder.bytes();
}
