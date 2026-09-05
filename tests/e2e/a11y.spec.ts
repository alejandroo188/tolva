import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const legalRoutes = ["/aviso-legal", "/privacidad", "/cookies", "/terminos", "/licencias"];

const schemes = ["light", "dark"] as const;

/** Espera a que next-themes aplique la clase del tema resuelto. */
async function waitForTheme(page: import("@playwright/test").Page, scheme: string) {
  await page.waitForFunction((s) => document.documentElement.classList.contains(s), scheme);
}

for (const route of ["/dev/ui", ...legalRoutes]) {
  for (const scheme of schemes) {
    test(`axe-core sin violaciones en ${route} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(route);
      await waitForTheme(page, scheme);

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test("recorrido por teclado con foco visible", async ({ page }) => {
  await page.goto("/dev/ui");

  // Recorre la página con Tab: cada control interactivo que recibe foco debe
  // mostrarlo (:focus-visible). Los destinos no interactivos del navegador
  // (p. ej. el <body> o un <dialog> cerrado en WebKit) se ignoran.
  let controlesVerificados = 0;
  for (let i = 0; i < 40 && controlesVerificados < 12; i++) {
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
    controlesVerificados++;
    expect(step).toBe("visible");
  }
});

test("prefers-reduced-motion con emulateMedia", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const matches = await page.evaluate(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  expect(matches).toBe(true);
});
