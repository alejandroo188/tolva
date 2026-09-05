/**
 * Orientación EXIF → dimensiones orientadas (§8.1).
 *
 * Puro: mapea la orientación EXIF 1–8 a las dimensiones que la imagen tiene
 * *una vez enderezada*. Para las orientaciones que giran 90° (5–8) se
 * intercambian ancho y alto; el resto conserva las dimensiones almacenadas.
 *
 * La transformación de píxeles en sí (rotación + volteos sobre el canvas) vive
 * en el worker (depende de `OffscreenCanvas`); aquí sólo se testea la parte
 * matemática pura.
 */

import type { Dimensions, ExifOrientation } from "./types";

/** ¿Es `value` una orientación EXIF válida (1–8)? */
export function isExifOrientation(value: number): value is ExifOrientation {
  return Number.isInteger(value) && value >= 1 && value <= 8;
}

/**
 * Dimensiones de la imagen ya orientada. Las orientaciones 5–8 implican una
 * rotación de 90° y por tanto intercambian ancho y alto.
 */
export function orientedDimensions(
  width: number,
  height: number,
  orientation: ExifOrientation,
): Dimensions {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return { width: 1, height: 1 };
  }
  const swaps = orientation >= 5 && orientation <= 8;
  return swaps ? { width: height, height: width } : { width, height };
}
