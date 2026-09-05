import { expect, test } from "@playwright/test";

const widths = [360, 768, 1024, 1440];
const schemes = ["light", "dark"] as const;

test("el tema cambia la superficie (claro vs oscuro)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const light = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  expect(light).not.toBe(dark);
});

test("la cifra usa el tamaño display (elemento héroe)", async ({ page }) => {
  await page.goto("/dev/ui");
  const size = await page.getByText("34,7 MB").evaluate((el) => getComputedStyle(el).fontSize);
  expect(size).toBe("56px");
});

for (const width of widths) {
  for (const scheme of schemes) {
    test(`sin desbordamiento horizontal a ${width}px en ${scheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `test-results/design/home-${width}-${scheme}.png`,
        fullPage: true,
      });
    });
  }
}
