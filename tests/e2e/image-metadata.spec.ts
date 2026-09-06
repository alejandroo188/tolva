/**
 * E2E §8.3 recorrido 5 (parte de interfaz) — el EXIF que se lee del fichero **se
 * muestra**: un JPEG con GPS lo dice explícitamente, junto al interruptor que
 * decide si se elimina, y el mensaje cambia con el interruptor. Un PNG sin
 * metadatos no muestra nada.
 *
 * La verificación de que el borrado funciona de verdad (sin APP1 ni GPS en la
 * salida) vive en `image-formats.spec.ts`, contra el motor.
 */

import { expect, test } from "@playwright/test";
import { fixturePath, upload } from "./image-ui";

test("un JPEG con GPS lo anuncia y el mensaje sigue al interruptor", async ({ page }) => {
  await page.goto("/");
  await upload(page, [fixturePath("exif.jpg")]);
  await expect(page.getByRole("button", { name: "Recortar" })).toBeVisible();

  const notice = page.getByRole("status").filter({ hasText: /EXIF/ });
  await expect(notice).toContainText(/coordenadas GPS/i);
  // Por defecto se eliminan: el aviso lo dice.
  await expect(notice).toContainText(/Se eliminarán al exportar/i);

  await page.getByRole("switch", { name: "Eliminar metadatos" }).click();
  await expect(notice).toContainText(/Se conservarán al exportar/i);
});

test("una imagen sin metadatos no muestra el aviso", async ({ page }) => {
  await page.goto("/");
  await upload(page, [fixturePath("gradient.png")]);
  await expect(page.getByRole("button", { name: "Recortar" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /EXIF/ })).toHaveCount(0);
});
