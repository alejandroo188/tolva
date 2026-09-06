import { describe, expect, it } from "vitest";
import { eventCombo, findShortcut, type KeyLike } from "../../src/lib/image/shortcuts";

function key(partial: Partial<KeyLike>): KeyLike {
  return {
    key: "",
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ctrlKey: false,
    isEditable: false,
    ...partial,
  };
}

describe("eventCombo", () => {
  it("normaliza a minúsculas y añade modificadores en orden", () => {
    expect(eventCombo(key({ key: "H" }))).toBe("h");
    expect(eventCombo(key({ key: "r", shiftKey: true }))).toBe("shift+r");
    expect(eventCombo(key({ key: "z", metaKey: true }))).toBe("mod+z");
  });

  it("un modificador pulsado a solas no forma atajo", () => {
    expect(eventCombo(key({ key: "Shift", shiftKey: true }))).toBe("");
    expect(eventCombo(key({ key: "Control", ctrlKey: true }))).toBe("");
  });

  it("un símbolo con Shift («?») no añade el modificador", () => {
    expect(eventCombo(key({ key: "?", shiftKey: true }))).toBe("?");
  });

  it("el foco en un campo editable suprime el atajo", () => {
    expect(eventCombo(key({ key: "h", isEditable: true }))).toBe("");
  });
});

describe("findShortcut", () => {
  it("encuentra los atajos registrados por combinación", () => {
    expect(findShortcut(key({ key: "c" }))?.id).toBe("crop");
    expect(findShortcut(key({ key: "r", shiftKey: true }))?.id).toBe("rotate-ccw");
    expect(findShortcut(key({ key: "?" }))?.id).toBe("shortcuts");
    // Tecla real de «?»: Shift está pulsado (teclado US/ES), no debe romperlo.
    expect(findShortcut(key({ key: "?", shiftKey: true }))?.id).toBe("shortcuts");
  });

  it("devuelve null para combinaciones no registradas", () => {
    expect(findShortcut(key({ key: "q" }))).toBeNull();
    expect(findShortcut(key({ key: "shift" }))).toBeNull();
  });
});
