/**
 * Preferencias del usuario, persistidas en `localStorage` con versión.
 *
 * **Sólo ajustes, nunca ficheros de usuario** (§8.3 recorrido 11): aquí no
 * entra ni un byte de imagen. La clave está versionada y cada carga valida los
 * campos; ante cualquier valor inválido se cae al por defecto. Nunca lanza.
 */

import type { OutputFormat } from "@/lib/domain/types";
import { isOutputFormat } from "@/lib/domain/quality";

/** Versión actual del esquema. Se incrementa al cambiar la forma. */
export const PREFERENCES_VERSION = 1;

export interface Preferences {
  version: number;
  /** Formato de salida por defecto. */
  outputFormat: OutputFormat;
  /** Calidad por defecto (0–100). */
  quality: number;
  /** Eliminar metadatos por defecto. */
  stripMetadata: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  version: PREFERENCES_VERSION,
  outputFormat: "webp",
  quality: 80,
  stripMetadata: true,
};

/** Clave única de almacenamiento (no colisiona con otras apps del origen). */
export const PREFERENCES_KEY = "tolva:preferences:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPercent(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

/** Valida y completa un objeto de preferencias; ante cualquier fallo, por defecto. */
function sanitize(value: unknown): Preferences {
  if (!isRecord(value)) return { ...DEFAULT_PREFERENCES };
  const outputFormat = isOutputFormat(value.outputFormat)
    ? value.outputFormat
    : DEFAULT_PREFERENCES.outputFormat;
  const quality = isPercent(value.quality) ? value.quality : DEFAULT_PREFERENCES.quality;
  const stripMetadata =
    typeof value.stripMetadata === "boolean"
      ? value.stripMetadata
      : DEFAULT_PREFERENCES.stripMetadata;
  return { version: PREFERENCES_VERSION, outputFormat, quality, stripMetadata };
}

/**
 * Carga las preferencias. Nunca lanza: `localStorage` puede no existir (SSR,
 * modo privado) o devolver JSON corrupto; en ese caso se devuelve el por
 * defecto.
 */
export function loadPreferences(storage?: Storage): Preferences {
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(PREFERENCES_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

/** Guarda las preferencias. Nunca lanza (falla en silencio si no hay `localStorage`). */
export function savePreferences(prefs: Preferences, storage?: Storage): void {
  try {
    (storage ?? globalThis.localStorage)?.setItem(PREFERENCES_KEY, JSON.stringify(sanitize(prefs)));
  } catch {
    /* cuota agotada o storage bloqueado: se ignora, la app sigue funcionando */
  }
}
