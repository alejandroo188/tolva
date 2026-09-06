import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // Mismo alias que `tsconfig.json` (`@/*` → `./src/*`) para los imports de valor.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // La cobertura sólo se activa con `vitest run --coverage`. Umbral del §8.1
    // sobre el dominio puro; se ejerce a partir del Hito 1, cuando `domain/` existe.
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      include: ["src/lib/domain/**"],
      thresholds: {
        lines: 90,
        branches: 90,
      },
    },
  },
});
