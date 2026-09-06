/**
 * Registro de atajos de teclado del editor.
 *
 * Puro y testeable: recibe la forma de un `KeyboardEvent` (no el evento real)
 * y devuelve la combinación canónica o el atajo coincidente. El `useEffect` que
 * escucha los eventos vive en la UI (§4.4); aquí sólo está el qué y el cómo
 * comparar.
 */

/** Lo mínimo que se necesita de un evento para identificar un atajo. */
export interface KeyLike {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  /** `true` si el foco está en un campo de texto (no disparar atajos). */
  isEditable?: boolean;
}

export type ShortcutGroup = "general" | "editor";

export interface Shortcut {
  id: string;
  /** Combinación canónica, p. ej. `"?"`, `"h"`, `"shift+r"`, `"mod+z"`. */
  combo: string;
  /** Etiqueta para mostrar, p. ej. `"H"`, `"Shift R"`, `"Cmd Z"`. */
  label: string;
  description: string;
  group: ShortcutGroup;
}

/** Teclas que por sí solas no forman un atajo (modificadores pulsados a solas). */
const MODIFIER_KEYS = new Set(["shift", "control", "alt", "meta"]);

/**
 * Combinación canónica de un evento. Devuelve `""` cuando no es una pulsación
 * accionable (un modificador suelto o foco en un campo editable).
 */
export function eventCombo(e: KeyLike): string {
  const key = e.key.toLowerCase();
  if (MODIFIER_KEYS.has(key)) return "";
  if (e.isEditable) return "";
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("mod");
  if (e.altKey) parts.push("alt");
  // Shift sólo distingue mayúsculas en letras (r → R). Los símbolos como «?»
  // llevan el Shift implícito en el propio `key`, así que no se cuenta.
  if (e.shiftKey && /^[a-z]$/.test(key)) parts.push("shift");
  parts.push(key);
  return parts.join("+");
}

/**
 * Atajos del editor. Los ids son los que consume la UI; las descripciones se
 * muestran en la hoja de atajos (§8.3 recorrido 12, «documentados en la UI»).
 */
export const SHORTCUTS: Shortcut[] = [
  { id: "crop", combo: "c", label: "C", description: "Activar el recorte", group: "editor" },
  { id: "rotate", combo: "r", label: "R", description: "Rotar 90° a la derecha", group: "editor" },
  {
    id: "rotate-ccw",
    combo: "shift+r",
    label: "Shift R",
    description: "Rotar 90° a la izquierda",
    group: "editor",
  },
  { id: "flip-h", combo: "h", label: "H", description: "Voltear horizontal", group: "editor" },
  { id: "flip-v", combo: "v", label: "V", description: "Voltear vertical", group: "editor" },
  { id: "grayscale", combo: "g", label: "G", description: "Escala de grises", group: "editor" },
  { id: "reset", combo: "0", label: "0", description: "Restablecer ajustes", group: "editor" },
  { id: "shortcuts", combo: "?", label: "?", description: "Mostrar los atajos", group: "general" },
];

/** Mapa combo → atajo para búsqueda en O(1). */
export const SHORTCUTS_BY_COMBO: ReadonlyMap<string, Shortcut> = new Map(
  SHORTCUTS.map((s) => [s.combo, s]),
);

/** Encuentra el atajo que corresponde a un evento, o `null`. */
export function findShortcut(e: KeyLike): Shortcut | null {
  const combo = eventCombo(e);
  if (!combo) return null;
  return SHORTCUTS_BY_COMBO.get(combo) ?? null;
}
