/**
 * Tipos y validación de los presets editables (`src/config/*.json`).
 *
 * Puro: recibe `unknown` y devuelve estructuras tipadas o lanza un `Error` con
 * mensaje concreto. Nunca lee ficheros ni usa APIs del navegador.
 */

import type { Ratio } from "./types";

/** Un preset de recorte de redes sociales (avatar, historia, post, …). */
export interface SocialPreset {
  id: string;
  label: string;
  ratio: Ratio;
}

/** Un preset de codificación de vídeo. */
export interface VideoPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  fps: number;
  /** Bitrate de vídeo en bits por segundo. */
  videoBitrate: number;
  /** Bitrate de audio en bits por segundo. */
  audioBitrate: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Asegura que los `id` de una lista de presets son únicos. */
function assertUniqueIds(items: { id: string }[], kind: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`Preset ${kind} con id duplicado: "${item.id}"`);
    seen.add(item.id);
  }
}

/**
 * Valida y tipa el contenido de `social-presets.json`. Lanza `Error` con un
 * mensaje concreto ante cualquier entrada inválida.
 */
export function parseSocialPresets(input: unknown): SocialPreset[] {
  if (!Array.isArray(input)) throw new Error("social-presets.json debe contener un array");
  const presets = input.map((item, index) => {
    if (!isRecord(item)) throw new Error(`Preset social #${index}: no es un objeto`);
    if (!isNonEmptyString(item.id)) throw new Error(`Preset social #${index}: "id" inválido`);
    if (!isNonEmptyString(item.label)) throw new Error(`Preset social #${index}: "label" inválido`);
    const ratio = item.ratio;
    if (!isRecord(ratio) || !isFinitePositive(ratio.w) || !isFinitePositive(ratio.h)) {
      throw new Error(
        `Preset social #${index} ("${item.id}"): "ratio" inválido (w y h deben ser > 0)`,
      );
    }
    return {
      id: item.id,
      label: item.label,
      ratio: { w: ratio.w, h: ratio.h },
    };
  });
  assertUniqueIds(presets, "social");
  return presets;
}

/**
 * Valida y tipa el contenido de `video-presets.json`. Lanza `Error` con un
 * mensaje concreto ante cualquier entrada inválida.
 */
export function parseVideoPresets(input: unknown): VideoPreset[] {
  if (!Array.isArray(input)) throw new Error("video-presets.json debe contener un array");
  const presets = input.map((item, index) => {
    if (!isRecord(item)) throw new Error(`Preset de vídeo #${index}: no es un objeto`);
    if (!isNonEmptyString(item.id)) throw new Error(`Preset de vídeo #${index}: "id" inválido`);
    if (!isNonEmptyString(item.label))
      throw new Error(`Preset de vídeo #${index}: "label" inválido`);
    if (
      !isFinitePositive(item.width) ||
      !isFinitePositive(item.height) ||
      !isFinitePositive(item.fps)
    ) {
      throw new Error(
        `Preset de vídeo #${index} ("${item.id}"): width, height y fps deben ser > 0`,
      );
    }
    if (!isFinitePositive(item.videoBitrate) || !isFinitePositive(item.audioBitrate)) {
      throw new Error(
        `Preset de vídeo #${index} ("${item.id}"): videoBitrate y audioBitrate deben ser > 0`,
      );
    }
    return {
      id: item.id,
      label: item.label,
      width: item.width,
      height: item.height,
      fps: item.fps,
      videoBitrate: item.videoBitrate,
      audioBitrate: item.audioBitrate,
    };
  });
  assertUniqueIds(presets, "de vídeo");
  return presets;
}
