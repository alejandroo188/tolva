/**
 * Revisión visual de la interfaz de imagen (§8.3, criterio de Hito 4): sin
 * desbordamiento horizontal a 360/768/1024/1440 px en claro y oscuro, con el
 * editor poblado (una imagen cargada). Genera las 8 capturas en
 * `test-results/design/imagen-*.png` para revisión humana.
 */

import { expect, test } from "@playwright/test";
import { fixturePath, upload } from "./image-ui";

const widths = [360, 768, 1024, 1440];
const schemes = ["light", "dark"] as const;

for (const width of widths) {
  for (const scheme of schemes) {
    test(`la interfaz de imagen no desborda a ${width}px en ${scheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      await upload(page, [fixturePath("gradient.png")]);
      // Espera a que el editor esté montado (fuente + borrador disponibles).
      await expect(page.getByRole("button", { name: "Recortar" })).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `test-results/design/imagen-${width}-${scheme}.png`,
        fullPage: true,
      });
    });
  }
}
