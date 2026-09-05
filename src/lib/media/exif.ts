/**
 * Lectura de EXIF (orientación y GPS) con `exifreader` (§5.1, §8.3 caso 5).
 *
 * La lectura es barata y síncrona (los tags de orientación y GPS se parsean del
 * TIFF sin trabajo asíncrono), y se usa en el hilo principal para construir la
 * receta: rellenar `source.exifOrientation` y exponer la presencia de GPS.
 */

import { load } from "exifreader";
import { isExifOrientation } from "@/lib/domain/orientation";
import { hasExifApp1 } from "@/lib/media/jpeg-exif";
import type { ExifOrientation } from "@/lib/domain/types";

/** Lo que la UI necesita saber del EXIF de un fichero. */
export interface ExifInfo {
  /** Orientación 1–8; 1 (sin rotación) si no hay EXIF o es inválida. */
  orientation: ExifOrientation;
  /** `true` si el fichero contenía un bloque EXIF. */
  hasExif: boolean;
  /** `true` si el EXIF incluía coordenadas GPS (latitud y longitud). */
  hasGps: boolean;
}

/** Sin EXIF: el resultado neutro por defecto. */
const NONE: ExifInfo = { orientation: 1, hasExif: false, hasGps: false };

/** Lee EXIF de un buffer de imagen. **Nunca lanza**: ante error devuelve `NONE`. */
export function readExif(bytes: ArrayBuffer): ExifInfo {
  try {
    // Sin bloque APP1 de EXIF no hay nada que leer (exifreader devuelve tags
    // genéricos del contenedor —IFD/PNG/ICC— aunque no exista EXIF, por eso la
    // presencia se decide por la firma de bytes, no por el resultado de `load`).
    if (!hasExifApp1(bytes)) return NONE;
    const tags = load(bytes);
    const raw = tags.Orientation?.value;
    const orientation = typeof raw === "number" && isExifOrientation(raw) ? raw : 1;
    const hasGps = Boolean(tags.GPSLatitude && tags.GPSLongitude);
    return { orientation, hasExif: true, hasGps };
  } catch {
    return NONE;
  }
}
