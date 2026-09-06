/**
 * Ingesta: de `File` a `SourceItem` listo para editar y convertir.
 *
 * Lee los bytes, detecta el formato por firma, extrae el EXIF (orientación y
 * GPS) y consulta las dimensiones **orientadas** al worker vía `probe` (nunca
 * decodifica píxeles en el hilo principal, §4.2). Devuelve un resultado
 * discriminado con un mensaje útil para cada fallo (§8.3 recorrido 7).
 */

import type { Dimensions, ExifOrientation } from "@/lib/domain/types";
import { readExif, type ExifInfo } from "@/lib/media/exif";
import {
  detectFormat,
  hasJpegEndOfImage,
  mimeForFormat,
  type DetectedFormat,
} from "@/lib/media/sniff";

/** Obtiene las dimensiones orientadas de una fuente (delegado en el worker). */
export type ProbeFn = (
  bytes: ArrayBuffer,
  mime: string,
  orientation: ExifOrientation,
) => Promise<Dimensions>;

/** Un fichero de imagen admitido, con sus metadatos y sus bytes originales. */
export interface SourceItem {
  id: string;
  name: string;
  /** MIME canónico (no la extensión del fichero). */
  type: string;
  /** Tamaño original en bytes. */
  bytes: number;
  /** Bytes originales (para el worker). */
  data: ArrayBuffer;
  /** `objectURL` del original (para miniaturas; lo decodifica el navegador). */
  objectUrl: string;
  /** Formato detectado por firma, o `null` (nunca llega a `SourceItem` con `null`). */
  format: DetectedFormat;
  /** Dimensiones orientadas (tras aplicar la orientación EXIF). */
  width: number;
  height: number;
  exifOrientation: ExifOrientation;
  hasExif: boolean;
  hasGps: boolean;
  /** Clave de deduplicación (`name:size:lastModified`). */
  fingerprint: string;
}

/** Códigos de fallo de la ingesta (cada uno con su mensaje en `reason`). */
export type IntakeFailureCode = "empty" | "unsupported" | "undecodable" | "duplicate";

/** Un fallo de ingesta, con un mensaje útil para la UI. */
export interface IntakeFailure {
  ok: false;
  code: IntakeFailureCode;
  reason: string;
}

export type IntakeResult = { ok: true; item: SourceItem } | IntakeFailure;

export interface IntakeOptions {
  /** Huellas ya presentes, para rechazar la doble carga del mismo fichero. */
  existing?: ReadonlySet<string>;
  /** Generador de id (inyectable para tests deterministas). */
  makeId?: () => string;
}

/** Huella de deduplicación de un `File` (no del contenido, sino de la identidad). */
export function fileFingerprint(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

const UNSUPPORTED_MESSAGE =
  "Formato no soportado. Se admiten JPEG, PNG, WebP, AVIF, JPEG XL, GIF, BMP, TIFF y SVG.";

/**
 * Convierte un `File` en un `SourceItem`. Nunca lanza: devuelve un resultado
 * discriminado. La decodificación (para dimensiones) ocurre en el worker vía
 * `probe`; el hilo principal sólo lee bytes, firma y EXIF.
 */
export async function intakeFile(
  file: File,
  probe: ProbeFn,
  options: IntakeOptions = {},
): Promise<IntakeResult> {
  const fingerprint = fileFingerprint(file);
  if (options.existing?.has(fingerprint)) {
    return { ok: false, code: "duplicate", reason: `«${file.name}» ya está en la cola.` };
  }

  if (file.size === 0) {
    return { ok: false, code: "empty", reason: `«${file.name}» está vacío (0 bytes).` };
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    return { ok: false, code: "empty", reason: `No se pudo leer «${file.name}».` };
  }

  const format = detectFormat(bytes);
  if (!format) {
    return { ok: false, code: "unsupported", reason: `«${file.name}»: ${UNSUPPORTED_MESSAGE}` };
  }

  // Un JPEG sin marcador de fin está truncado. Se rechaza aquí, antes de tocar el
  // decodificador, para que el resultado no dependa de la tolerancia del navegador.
  if (format === "jpeg" && !hasJpegEndOfImage(bytes)) {
    return {
      ok: false,
      code: "undecodable",
      reason: `«${file.name}» parece un JPEG pero no se pudo decodificar: está truncado (falta el marcador de fin de imagen).`,
    };
  }

  const mime = mimeForFormat(format);
  const exif: ExifInfo = readExif(bytes);

  let dimensions: Dimensions;
  try {
    dimensions = await probe(bytes, mime, exif.orientation);
  } catch {
    return {
      ok: false,
      code: "undecodable",
      reason: `«${file.name}» parece un ${format.toUpperCase()} pero no se pudo decodificar. Puede estar corrupto o truncado.`,
    };
  }

  if (dimensions.width <= 0 || dimensions.height <= 0) {
    return {
      ok: false,
      code: "undecodable",
      reason: `«${file.name}» no tiene dimensiones válidas.`,
    };
  }

  const item: SourceItem = {
    id: options.makeId ? options.makeId() : crypto.randomUUID(),
    name: file.name,
    type: mime,
    bytes: file.size,
    data: bytes,
    objectUrl: URL.createObjectURL(file),
    format,
    width: dimensions.width,
    height: dimensions.height,
    exifOrientation: exif.orientation,
    hasExif: exif.hasExif,
    hasGps: exif.hasGps,
    fingerprint,
  };

  return { ok: true, item };
}
