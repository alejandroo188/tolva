/**
 * Tipos compartidos del dominio.
 *
 * Fichero 100 % puro: sólo `type`/`interface`, sin código ejecutable y sin
 * ninguna API del navegador. Todo lo demás del dominio importa desde aquí.
 */

/** Formatos de salida que Tolva puede *producir*. TIFF es sólo lectura (§8.3). */
export type OutputFormat = "jpeg" | "png" | "webp" | "avif" | "jxl" | "gif" | "bmp";

/** Orientación EXIF 1–8 (1 = normal; 6 = 90° horario, la más habitual). */
export type ExifOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Un tamaño expresado en píxeles enteros. */
export interface Dimensions {
  width: number;
  height: number;
}

/** Un rectángulo en píxeles, con origen arriba a la izquierda. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Un punto en el plano (píxeles). */
export interface Point {
  x: number;
  y: number;
}

/** Proporción expresada como `w:h` (ej. `{ w: 16, h: 9 }`). */
export interface Ratio {
  w: number;
  h: number;
}

/** La fuente original: metadatos necesarios para razonar la receta, nunca los píxeles. */
export interface SourceInfo {
  id: string;
  name: string;
  /** MIME, p. ej. `"image/jpeg"`. */
  type: string;
  /** Tamaño en bytes. */
  bytes: number;
  width: number;
  height: number;
  exifOrientation: ExifOrientation;
}

/** Cómo se codifica el resultado. */
export interface OutputSpec {
  format: OutputFormat;
  /** Calidad 0–100. Sólo afecta a los formatos con pérdida. */
  quality: number;
  stripMetadata: boolean;
  /** Tope de bytes opcional: se puede usar para estimar/iterar la calidad. */
  maxBytes?: number;
}

/** Modos de redimensionado. `fit`/`contain` son sinónimos; `cover` recorta. */
export type ResizeMode = "fit" | "contain" | "cover" | "fill";

/** Recorte normalizado: origen + tamaño dentro de la imagen *ya orientada*. */
export interface CropOp {
  type: "crop";
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Rotación en pasos de 90°. */
export interface RotateOp {
  type: "rotate";
  degrees: 90 | 180 | 270;
}

/** Enderezado libre: rotación por un ángulo arbitrario en grados. */
export interface StraightenOp {
  type: "straighten";
  /** Ángulo en grados, en sentido horario (positivo = hacia la derecha). */
  degrees: number;
}

/** Espejo horizontal o vertical. */
export interface FlipOp {
  type: "flip";
  axis: "horizontal" | "vertical";
}

/** Redimensionado con su modo y si se permite ampliar. */
export interface ResizeOp {
  type: "resize";
  width: number;
  height: number;
  mode: ResizeMode;
  upscale: boolean;
}

/** Ajustes de color en tanto por ciento (−100…100, 0 = sin cambio). */
export interface AdjustOp {
  type: "adjust";
  brightness: number;
  contrast: number;
  saturation: number;
  /** Temperatura: −100 (frío, azul) … +100 (cálido, ámbar). */
  temperature: number;
  /** Escala de grises: desaturación total cuando está activada. */
  grayscale: boolean;
}

/** Posiciones de marca de agua (brújula + centro). */
export type WatermarkPosition = "nw" | "n" | "ne" | "w" | "center" | "e" | "sw" | "s" | "se";

/** Marca de agua de texto. */
export interface WatermarkText {
  kind: "text";
  text: string;
  /** Opacidad 0–1. */
  opacity: number;
  position: WatermarkPosition;
}

/** Marca de agua de imagen (logo), como `data:` URL para que la receta siga siendo serializable. */
export interface WatermarkImage {
  kind: "image";
  /** `data:image/…` del logo. Se decodifica en el worker. */
  imageDataUrl: string;
  /** Opacidad 0–1. */
  opacity: number;
  position: WatermarkPosition;
}

/** Marca de agua: texto o imagen. Comparten `type: "watermark"` (orden canónico). */
export type WatermarkOp = (WatermarkText | WatermarkImage) & { type: "watermark" };

/**
 * Una operación de la receta. El orden canónico es
 * `crop → rotate → straighten → flip → resize → adjust → watermark`.
 */
export type Op = CropOp | RotateOp | StraightenOp | FlipOp | ResizeOp | AdjustOp | WatermarkOp;

/**
 * La receta: el corazón del dominio (§4.3). Serializable y pura; el worker es
 * sólo su ejecutor.
 */
export interface EditRecipe {
  source: SourceInfo;
  ops: Op[];
  output: OutputSpec;
}
