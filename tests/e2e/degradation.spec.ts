/**
 * E2E — criterio de aceptación del Hito 4: «con `VideoEncoder`/`OffscreenCanvas`
 * mockeados como ausentes, mensaje claro y ruta alternativa, nunca un error
 * críptico».
 *
 * Los globals se borran con `addInitScript`, antes de que cargue la aplicación,
 * de modo que la detección de capacidades (§8.1) los vea ausentes de verdad. El
 * borrado sólo afecta al hilo principal: el worker conserva su propio ámbito, que
 * es justamente la ruta alternativa que se comprueba aquí.
 */

import { expect, test } from "@playwright/test";
import { fixturePath, upload } from "./image-ui";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    for (const name of ["OffscreenCanvas", "VideoEncoder", "VideoDecoder"]) {
      try {
        delete (globalThis as unknown as Record<string, unknown>)[name];
      } catch {
        // Si el navegador no deja borrarlo, se enmascara con `undefined`.
        Object.defineProperty(globalThis, name, { value: undefined, configurable: true });
      }
    }
  });
});

test("sin OffscreenCanvas ni WebCodecs se explica la limitación en la propia interfaz", async ({
  page,
}) => {
  await page.goto("/");

  const banner = page.getByRole("region", { name: "Limitaciones de este navegador" });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(/Sin OffscreenCanvas/i);
  await expect(banner).toContainText(/Sin WebCodecs/i);

  // El mensaje dice qué pasa y qué se puede hacer, no un código de error.
  await expect(banner).toContainText(/hilo principal/i);
  await expect(banner).not.toContainText(/undefined|\[object|Error:/);
});

test("sin esas capacidades la conversión de imagen sigue funcionando", async ({ page }) => {
  await page.goto("/");
  await upload(page, [fixturePath("gradient.png")]);
  await expect(page.getByRole("button", { name: "Recortar" })).toBeVisible();

  await page.getByRole("button", { name: "Convertir", exact: true }).click();
  await expect(page.getByText("Listo", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Descargar/ }).first()).toBeEnabled();
});
