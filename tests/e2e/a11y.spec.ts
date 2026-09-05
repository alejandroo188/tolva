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

  // El primer Tab mueve el foco al primer elemento interactivo.
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => {
    const el = document.activeElement;
    return {
      moved: el !== null && el !== document.body,
      visible: el instanceof HTMLElement && el.matches(":focus-visible"),
    };
  });
  expect(first.moved).toBe(true);
  expect(first.visible).toBe(true);

  // Sigue recorriendo: cada salto de Tab debe conservar un foco visible.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    const step = await page.evaluate(() => {
      const el = document.activeElement;
      return el instanceof HTMLElement && el.matches(":focus-visible");
    });
    expect(step).toBe(true);
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
