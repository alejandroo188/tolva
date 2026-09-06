/**
 * E2E §8.3 recorrido 12 — teclado: recorrido del editor sólo con teclado (atajos)
 * y foco visible al tabular por los controles.
 */

import { expect, test } from "@playwright/test";
import { fixturePath, upload } from "./image-ui";

test("los atajos del editor funcionan sin ratón", async ({ page }) => {
  await page.goto("/");
  await upload(page, [fixturePath("checkerboard.png")]);
  await expect(page.getByRole("button", { name: "Recortar" })).toBeVisible();

  // «?» abre la hoja de atajos; se cierra con el botón «Cerrar».
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // «r» rota 90° a la derecha.
  await page.keyboard.press("r");
  await expect(page.getByText("Rotación: 90°")).toBeVisible();

  // «Shift R» rota a la izquierda (vuelve a 0°).
  await page.keyboard.press("Shift+r");
  await expect(page.getByText("Rotación: Sin rotación")).toBeVisible();

  // «g» alterna la escala de grises.
  const grayscale = page.getByRole("switch", { name: "Escala de grises" });
  await page.keyboard.press("g");
  await expect(grayscale).toHaveAttribute("aria-checked", "true");

  // «0» restablece los ajustes.
  await page.keyboard.press("0");
  await expect(grayscale).toHaveAttribute("aria-checked", "false");
});

test("el foco es visible al tabular por el editor", async ({ page }) => {
  await page.goto("/");
  await upload(page, [fixturePath("checkerboard.png")]);
  // Se espera al editor antes de tabular: si el DOM sigue montándose mientras se
  // recorre, el foco puede caer en un elemento que desaparece y la comprobación
  // se vuelve inestable bajo carga.
  await expect(page.getByRole("button", { name: "Recortar" })).toBeVisible();

  let controlesVerificados = 0;
  for (let i = 0; i < 40 && controlesVerificados < 6; i += 1) {
    await page.keyboard.press("Tab");
    const step = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return "skip";
      const interactivo = el.matches(
        "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      if (!interactivo) return "skip";
      return el.matches(":focus-visible") ? "visible" : "oculto";
    });
    if (step === "skip") continue;
    controlesVerificados += 1;
    expect(step).toBe("visible");
  }
  expect(controlesVerificados).toBeGreaterThanOrEqual(6);
});
