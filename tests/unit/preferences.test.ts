import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type Preferences,
} from "../../src/lib/image/preferences";

/** Storage en memoria para no tocar el `localStorage` real de Node. */
function memoryStorage(): Storage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => data.delete(k),
    setItem: (k, v) => data.set(k, v),
  };
}

describe("preferencias", () => {
  it("sin almacenamiento devuelve los valores por defecto", () => {
    const prefs = loadPreferences(memoryStorage());
    expect(prefs).toEqual(DEFAULT_PREFERENCES);
  });

  it("guarda y recarga los valores, sobreviviendo al round-trip", () => {
    const storage = memoryStorage();
    savePreferences(
      { version: 1, outputFormat: "jxl", quality: 60, stripMetadata: false },
      storage,
    );
    const reloaded = loadPreferences(storage);
    expect(reloaded.outputFormat).toBe("jxl");
    expect(reloaded.quality).toBe(60);
    expect(reloaded.stripMetadata).toBe(false);
  });

  it("sanea campos inválidos cayendo al por defecto", () => {
    const storage = memoryStorage();
    storage.setItem(
      "tolva:preferences:v1",
      JSON.stringify({ outputFormat: "pdf", quality: 999, stripMetadata: "sí" }),
    );
    const prefs = loadPreferences(storage);
    // pdf no es formato de salida → cae al por defecto; quality 999 → por defecto.
    expect(prefs.outputFormat).toBe(DEFAULT_PREFERENCES.outputFormat);
    expect(prefs.quality).toBe(DEFAULT_PREFERENCES.quality);
    expect(prefs.stripMetadata).toBe(DEFAULT_PREFERENCES.stripMetadata);
  });

  it("nunca lanza ante JSON corrupto", () => {
    const storage = memoryStorage();
    storage.setItem("tolva:preferences:v1", "{no es json");
    expect(() => loadPreferences(storage)).not.toThrow();
    expect(loadPreferences(storage)).toEqual(DEFAULT_PREFERENCES);
  });

  it("no almacena nunca ficheros de usuario (sólo el objeto de ajustes)", () => {
    const storage = memoryStorage();
    const prefs: Preferences = {
      version: 1,
      outputFormat: "webp",
      quality: 80,
      stripMetadata: true,
    };
    savePreferences(prefs, storage);
    const raw = storage.getItem("tolva:preferences:v1")!;
    expect(raw).not.toContain("ArrayBuffer");
    expect(raw).not.toContain("data:image");
    expect(JSON.parse(raw)).toEqual(prefs);
  });
});
