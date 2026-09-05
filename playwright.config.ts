import { defineConfig, devices } from "@playwright/test";

/**
 * Proyectos del §8.4: tres navegadores más dos dispositivos móviles reales.
 * El job de CI (`ci.yml`) ejecuta la matriz chromium|firefox|webkit; los
 * proyectos de dispositivo se ejercitan en el Hito 9 y de forma manual.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "Pixel 7", use: { ...devices["Pixel 7"] } },
    { name: "iPhone 14", use: { ...devices["iPhone 14"] } },
  ],
});
