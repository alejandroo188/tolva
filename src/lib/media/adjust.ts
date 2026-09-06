/**
 * Ajustes de color por píxel, compartidos entre el worker (procesado real) y la
 * vista previa del editor (mismo resultado, sin deriva).
 *
 * Puro: recibe y devuelve números; no toca APIs del navegador. La función
 * `adjustColor` es la única fuente de verdad del matemático de
 * brillo/contraste/saturación/temperatura/escala de grises.
 */

/** Parámetros de ajuste, con la misma semántica que `AdjustOp`. */
export interface AdjustParams {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  grayscale: boolean;
}

/**
 * Transforma un píxel RGB (0–255, sin clamp) según los ajustes. Devuelve los
 * canales sin recortar; el llamador aplica `clampByte`.
 *
 * Orden (canónico): saturación → temperatura → contraste → brillo → grises.
 */
export function adjustColor(
  r: number,
  g: number,
  b: number,
  p: AdjustParams,
): [number, number, number] {
  const saturationF = 1 + p.saturation / 100;
  const contrastF = 1 + p.contrast / 100;
  const brightnessF = 1 + p.brightness / 100;
  const temp = p.temperature / 100;
  const tempR = 0.3 * temp;
  const tempB = -0.3 * temp;

  let r2 = r;
  let g2 = g;
  let b2 = b;

  // Saturación por luminancia (Rec. 601).
  const lum = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;
  r2 = lum + (r2 - lum) * saturationF;
  g2 = lum + (g2 - lum) * saturationF;
  b2 = lum + (b2 - lum) * saturationF;

  // Temperatura: desplaza rojo y azul en sentidos opuestos.
  r2 *= 1 + tempR;
  b2 *= 1 + tempB;

  // Contraste alrededor del gris medio.
  r2 = (r2 - 128) * contrastF + 128;
  g2 = (g2 - 128) * contrastF + 128;
  b2 = (b2 - 128) * contrastF + 128;

  // Brillo multiplicativo.
  r2 *= brightnessF;
  g2 *= brightnessF;
  b2 *= brightnessF;

  // Escala de grises: anula el color al final.
  if (p.grayscale) {
    const gray = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;
    r2 = gray;
    g2 = gray;
    b2 = gray;
  }

  return [r2, g2, b2];
}

/** Clampea un canal a [0, 255] con redondeo. */
export function clampByte(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

/** Aplica los ajustes a un buffer RGBA completo, mutándolo y devolviéndolo. */
export function adjustPixels(data: Uint8ClampedArray, p: AdjustParams): Uint8ClampedArray {
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = adjustColor(data[i], data[i + 1], data[i + 2], p);
    data[i] = clampByte(r);
    data[i + 1] = clampByte(g);
    data[i + 2] = clampByte(b);
  }
  return data;
}
