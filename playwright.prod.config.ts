import { defineConfig, devices } from "@playwright/test";

/**
 * Batería contra el **artefacto real**: `out/` servido con las cabeceras del
 * §9.3 (CSP, COOP, COEP) leídas de `vercel.json`.
 *
 * Es la que habría cazado que la CSP bloqueaba los scripts inline de Next y
 * dejaba la aplicación sin hidratar en producción: la batería normal corre
 * contra `next dev`, donde no se aplica ninguna de esas cabeceras.
 */
export default defineConfig({
  testDir: "./tests/prod",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && npm run serve:static",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
