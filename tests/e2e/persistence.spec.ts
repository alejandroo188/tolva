/**
 * E2E §8.3 recorrido 11 — persistencia: las preferencias sobreviven a la
 * recarga, y ningún fichero de usuario aparece en `localStorage`,
 * `sessionStorage` ni IndexedDB.
 */

import { expect, test } from "@playwright/test";
import { fixturePath, upload } from "./image-ui";

test("las preferencias sobreviven a la recarga", async ({ page }) => {
  await page.goto("/");
  await upload(page, [fixturePath("checkerboard.png")]);

  const pngRadio = page.getByRole("radio", { name: "PNG" });
  await pngRadio.click();
  await expect(pngRadio).toHaveAttribute("aria-checked", "true");

  // Al recargar, la fuente se pierde (sólo se persisten preferencias, no ficheros).
  await page.reload();
  await upload(page, [fixturePath("checkerboard.png")]);
  await expect(page.getByRole("radio", { name: "PNG" })).toHaveAttribute("aria-checked", "true");
});

test("ningún fichero de usuario se persiste en el almacenamiento", async ({ page }) => {
  await page.goto("/");
  await upload(page, [fixturePath("gradient.png")]); // 262 KB reales

  const storage = await page.evaluate(async () => {
    const local: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i)!;
      local[k] = localStorage.getItem(k)!;
    }
    const session: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i)!;
      session[k] = sessionStorage.getItem(k)!;
    }
    let idb: string[] = [];
    try {
      idb = (await indexedDB.databases()).map((d) => d.name ?? "");
    } catch {
      /* `databases()` no disponible: se asume vacío */
    }
    return { local, session, idb };
  });

  // Ningún valor de localStorage/sessionStorage puede contener bytes de imagen:
  // las preferencias y el tema son JSON/cadenas muy cortas.
  for (const value of [...Object.values(storage.local), ...Object.values(storage.session)]) {
    expect(value.length).toBeLessThan(10_000);
    expect(value.startsWith("data:image")).toBe(false);
  }

  // La app no crea ninguna base de datos IndexedDB. `__next_debug_channel` es
  // un canal interno de Next.js en modo dev (no existe en el export estático).
  expect(storage.idb.filter((name) => name !== "" && name !== "__next_debug_channel")).toEqual([]);
});
