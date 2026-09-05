import { expect, test } from "@playwright/test";

test("la aplicación carga y muestra Tolva", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Tolva/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Tolva/);
});
