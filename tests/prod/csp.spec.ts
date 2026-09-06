/**
 * El artefacto desplegable funciona **bajo sus propias cabeceras**.
 *
 * Estos tests existen por un fallo real: la CSP del §9.3 no lleva
 * `'unsafe-inline'`, así que bloqueaba los tres scripts inline que Next emite en
 * cada página y React nunca hidrataba. La aplicación se veía perfecta y no
 * respondía a nada. Ningún test lo vio porque todos corrían contra `next dev`,
 * sin cabeceras.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const FIXTURES = resolve(process.cwd(), "tests/fixtures/images");

/** Recoge errores de consola, violaciones de CSP y excepciones de la página. */
function collectProblems(page: import("@playwright/test").Page): string[] {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(`[${m.type()}] ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`[pageerror] ${String(e)}`));
  return problems;
}

test("la aplicación hidrata y funciona con la CSP real aplicada", async ({ page }) => {
  const problems = collectProblems(page);

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Hidratada de verdad: reacciona a un fichero. Sin hidratar, esto no ocurre.
  await page.setInputFiles('input[type="file"]', resolve(FIXTURES, "gradient.png"));
  await expect(page.getByRole("button", { name: "Recortar" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('img[alt^="Vista previa"]')).toBeVisible({ timeout: 30_000 });

  expect(problems).toEqual([]);
});

test("convertir y descargar funciona bajo la CSP real", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles('input[type="file"]', resolve(FIXTURES, "gradient.png"));
  await expect(page.getByRole("button", { name: "Recortar" })).toBeVisible({ timeout: 30_000 });

  await page.getByRole("radio", { name: "WebP", exact: true }).click();
  await page.getByRole("button", { name: "Convertir", exact: true }).click();
  await expect(page.getByText("Listo", { exact: true })).toHaveCount(1, { timeout: 45_000 });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Descargar", exact: true }).click(),
  ]);
  const bytes = readFileSync((await download.path())!);
  expect([...bytes.subarray(0, 4)]).toEqual([0x52, 0x49, 0x46, 0x46]); // RIFF
  expect([...bytes.subarray(8, 12)]).toEqual([0x57, 0x45, 0x42, 0x50]); // WEBP
});

test("COOP y COEP dan aislamiento de origen cruzado y SharedArrayBuffer", async ({ page }) => {
  await page.goto("/");
  const state = await page.evaluate(() => ({
    crossOriginIsolated: globalThis.crossOriginIsolated,
    sharedArrayBuffer: typeof SharedArrayBuffer,
  }));
  expect(state.crossOriginIsolated).toBe(true);
  expect(state.sharedArrayBuffer).toBe("function");
});

test("las cabeceras servidas son las del §9.3", async ({ page }) => {
  const response = await page.goto("/");
  const headers = response!.headers();
  expect(headers["content-security-policy"]).toContain("connect-src 'self'");
  expect(headers["content-security-policy"]).toContain("form-action 'none'");
  expect(headers["content-security-policy"]).not.toContain("unsafe-inline'; script-src");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["cross-origin-embedder-policy"]).toBe("require-corp");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["x-content-type-options"]).toBe("nosniff");
});

test("las rutas públicas se sirven desde el export estático", async ({ page }) => {
  // `cleanUrls` mapea `/aviso-legal` a `aviso-legal.html`. Se comprueba aquí
  // porque el despliegue publica `out/` directamente, sin el preset de Next.
  for (const route of ["/", "/aviso-legal", "/privacidad", "/cookies", "/terminos", "/licencias"]) {
    const response = await page.goto(route);
    expect(response?.status(), `ruta ${route}`).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("el HTML servido no lleva ningún script inline", async ({ page }) => {
  // La CSP no admite `'unsafe-inline'`: si vuelve a colarse uno, la página deja
  // de hidratar. Se afirma sobre el DOM ya cargado, no sobre el fichero.
  for (const route of ["/", "/privacidad"]) {
    await page.goto(route);
    const inline = await page.evaluate(
      () =>
        [...document.querySelectorAll("script")].filter(
          (s) => !s.src && (s.textContent ?? "").trim() !== "" && !s.type.includes("json"),
        ).length,
    );
    expect(inline, `ruta ${route}`).toBe(0);
  }
});
