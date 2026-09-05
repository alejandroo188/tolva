/**
 * Constantes de render de la operación `watermark` (§8.2).
 *
 * No son tokens de UI: son colores de dibujo sobre `OffscreenCanvas` (relleno y
 * sombra del texto), no estilos de la interfaz. Por eso `check-design-tokens`
 * excluye este fichero igual que `tokens.css`: aquí viven valores crudos a
 * propósito, centralizados para no repetirlos.
 */

/** Color del texto de la marca de agua (blanco, con opacidad vía `globalAlpha`). */
export const WATERMARK_FILL = "#ffffff";

/** Sombra del texto para asegurar legibilidad sobre fondos claros. */
export const WATERMARK_SHADOW = "rgba(0, 0, 0, 0.6)";
