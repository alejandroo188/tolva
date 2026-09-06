/**
 * E2E §8.3 recorrido 7 — casos límite en la ingesta: fichero corrupto, formato
 * no soportado, fichero vacío, doble carga del mismo fichero y pérdida de foco
 * de la pestaña durante el proceso. En todos: mensaje útil, nunca pantalla en
 * blanco ni error críptico.
 */

import { expect, test } from "@playwright/test";
import { fixturePath, upload } from "./image-ui";

test("un JPEG truncado produce un mensaje útil y no se añade", async ({ page }) => {
  await page.goto("/");
  await upload(page, [fixturePath("jpeg-truncated.jpg")]);
  await expect(page.getByText(/no se pudo decodificar/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /arrastra una imagen/i })).toBeVisible();
});

test("un formato no soportado (.psd) produce un mensaje útil", async ({ page }) => {
  await page.goto("/");
  // Magia PSD «8BPS» + relleno: no reconocida por `detectFormat`.
  const psd = Buffer.concat([Buffer.from([0x38, 0x42, 0x50, 0x53, 0x00, 0x01]), Buffer.alloc(64)]);
  await upload(page, [{ name: "photo.psd", mimeType: "image/vnd.adobe.photoshop", buffer: psd }]);
  await expect(page.getByText(/formato no soportado/i)).toBeVisible();
});

test("un fichero de 0 bytes produce un mensaje útil", async ({ page }) => {
  await page.goto("/");
  await upload(page, [fixturePath("empty.bin")]);
  await expect(page.getByText(/está vacío/i)).toBeVisible();
});

test("la doble carga del mismo fichero se rechaza", async ({ page }) => {
  await page.goto("/");
  const path = fixturePath("checkerboard.png");
  await upload(page, [path]);
  await expect(page.getByRole("option")).toHaveCount(1);

  // La segunda carga del mismo fichero (misma huella nombre:size:lastModified) se
  // rechaza: aparece el aviso y sigue habiendo una única fuente.
  await upload(page, [path]);
  await expect(page.getByText(/ya está en la cola/i)).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(1);
});

test("la pérdida de foco de la pestaña no rompe el proceso", async ({ page }) => {
  await page.goto("/");
  await upload(page, [fixturePath("checkerboard.png")]);
  await page.getByRole("button", { name: "Convertir", exact: true }).click();
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByText("Listo", { exact: true })).toHaveCount(1);
});
