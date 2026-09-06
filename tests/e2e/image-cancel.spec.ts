/**
 * E2E §8.3 recorrido 7 (cancelación) y criterio de aceptación de Hito 4
 * «Cancelación a mitad del lote»: cancelar una conversión en curso la deja como
 * «Cancelado» (sin resultado «Listo»), y cancelar un lote conserva lo ya hecho
 * y no procesa el resto.
 */

import { expect, test } from "@playwright/test";
import { fixturePath, upload } from "./image-ui";

test("cancelar una conversión a medias la deja como Cancelado", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  // El PNG grande (4000×3000) tarda varios segundos en codificarse: da margen
  // real para cancelar a media conversión.
  await upload(page, [fixturePath("large-4000x3000.png")]);

  await page.getByRole("button", { name: "Convertir", exact: true }).click();
  const cancelar = page.getByRole("button", { name: "Cancelar", exact: true });
  await cancelar.waitFor({ state: "visible" });
  await cancelar.click();

  await expect(page.getByText("Cancelado", { exact: true })).toBeVisible();
  await expect(page.getByText("Listo", { exact: true })).toHaveCount(0);
});

test("cancelar a mitad del lote conserva lo ya hecho y no procesa el resto", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  // Uno rápido (termina casi al instante) y uno lento: al cancelar el lote, el
  // rápido ya está «Listo» y el lento se descarta.
  await upload(page, [fixturePath("checkerboard.png"), fixturePath("large-4000x3000.png")]);

  await page.getByRole("button", { name: "Convertir todo" }).click();
  await expect(page.getByText("Listo", { exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Cancelar todo" }).click();

  // El terminado se conserva; el resto queda cancelado y no hay nada en curso.
  await expect(page.getByText("Listo", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Cancelado", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Cancelar todo" })).toBeHidden();
});
