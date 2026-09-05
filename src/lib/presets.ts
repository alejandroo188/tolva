/**
 * Carga y valida los presets editables (`src/config/*.json`).
 *
 * La validación falla en tiempo de carga (fail-fast): si un preset está mal
 * escrito, la app no arranca con datos corruptos. Los tipos y la validación
 * viven en `domain/presets.ts`; aquí sólo se aplican a los ficheros reales.
 */

import socialPresetsJson from "../config/social-presets.json";
import videoPresetsJson from "../config/video-presets.json";
import {
  parseSocialPresets,
  parseVideoPresets,
  type SocialPreset,
  type VideoPreset,
} from "./domain/presets";

/** Presets de recorte de redes sociales, validados. */
export const SOCIAL_PRESETS: SocialPreset[] = parseSocialPresets(socialPresetsJson);

/** Presets de codificación de vídeo, validados. */
export const VIDEO_PRESETS: VideoPreset[] = parseVideoPresets(videoPresetsJson);
