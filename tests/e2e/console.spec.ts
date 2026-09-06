/**
 * La consola queda limpia en el recorrido principal.
 *
 * Existe porque un selector que devolvía `[]` nuevo en cada llamada disparaba
 * «The result of getServerSnapshot should be cached to avoid an infinite loop»
 * sin romper ningún test: la interfaz funcionaba y React avisaba de un bucle de
 * render potencial. Este test convierte ese aviso en un fallo.
 */

import { expect, test } from "@playwright/test";
import { fixturePath, upload } from "./image-ui";

test("cargar, editar y convertir no deja errores en consola", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`[${message.type()}] ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`[pageerror] ${String(error)}`));

  await page.goto("/");
  await upload(page, [fixturePath("gradient.png")]);
  await expect(page.locator('img[alt^="Vista previa"]')).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Convertir", exact: true }).click();
  await expect(page.getByText("Listo", { exact: true })).toHaveCount(1);

  expect(problems).toEqual([]);
});
