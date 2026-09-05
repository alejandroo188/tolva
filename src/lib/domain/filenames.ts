/**
 * Nombres de fichero: cambio de extensión, sufijos, colisiones, sanitizado de
 * caracteres inválidos, nombres Unicode y longitud máxima (§8.1).
 */

import type { OutputFormat } from "./types";

/** Mapa de formato de salida → extensión de fichero. */
export const FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
  jxl: "jxl",
  gif: "gif",
  bmp: "bmp",
};

/** Caracteres prohibidos en sistemas de ficheros (Windows) y de control (U+0000–U+001F). */
const INVALID_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/** Nombres reservados en Windows. */
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/** Longitud máxima por defecto (conservadora, compatible con la mayoría de SO). */
const DEFAULT_MAX_LENGTH = 255;

/** Separa nombre base y extensión (`"foto.jpg"` → `["foto", "jpg"]`). */
function splitExt(name: string): [string, string] {
  const trimmed = name.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return [trimmed, ""];
  return [trimmed.slice(0, dot), trimmed.slice(dot + 1)];
}

/** Devuelve la extensión de salida para un formato dado. */
export function extensionForFormat(format: OutputFormat): string {
  return FORMAT_EXTENSIONS[format] ?? "bin";
}

/**
 * Cambia la extensión de `name` a la del `format` indicado.
 * `"foto.png"` + `webp` → `"foto.webp"`; sin extensión, se añade.
 */
export function changeExtension(name: string, format: OutputFormat): string {
  const [base] = splitExt(name);
  const stem = base.length > 0 ? base : "archivo";
  return `${stem}.${extensionForFormat(format)}`;
}

/**
 * Sanitiza un nombre de fichero: sustituye caracteres inválidos y de control,
 * recorta espacios/puntos sueltos en los extremos y neutraliza nombres
 * reservados. Conserva el Unicode (acentos, ñ, emoji, CJK…). Si queda vacío,
 * devuelve `"archivo"`.
 */
export function sanitizeFilename(name: string): string {
  let cleaned = name.replace(INVALID_CHARS, "_");
  // Recorta espacios y puntos en los extremos (impedidos por varios SO).
  cleaned = cleaned.replace(/^[\s.]+/, "").replace(/[\s.]+$/, "");
  if (cleaned.length === 0) return "archivo";
  if (RESERVED_NAMES.test(cleaned)) cleaned = `_${cleaned}`;
  return cleaned;
}

/**
 * Devuelve un nombre único dentro de `taken` añadiendo sufijos ` (1)`, ` (2)`, …
 * antes de la extensión: `"foto.jpg"` → `"foto (1).jpg"`.
 */
export function uniqueName(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  const [stem, ext] = splitExt(base);
  for (let i = 1; ; i += 1) {
    const candidate = ext.length > 0 ? `${stem} (${i}).${ext}` : `${stem} (${i})`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Limita la longitud de un nombre manteniendo la extensión intacta y al menos
 * 1 carácter en la base. La longitud se mide en unidades de código UTF-16
 * (suficiente para la mayoría de sistemas de ficheros).
 */
export function limitFilenameLength(name: string, maxLength: number = DEFAULT_MAX_LENGTH): string {
  if (maxLength < 1) maxLength = 1;
  if (name.length <= maxLength) return name;
  const [stem, ext] = splitExt(name);
  const suffix = ext.length > 0 ? `.${ext}` : "";
  const available = maxLength - suffix.length;
  if (available < 1) return suffix.slice(-maxLength) || "a";
  return `${stem.slice(0, available)}${suffix}`;
}
