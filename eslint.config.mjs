import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next ya registra eslint-plugin-jsx-a11y (lo incluye como
// dependencia), así que las reglas de accesibilidad quedan activas vía
// core-web-vitals/typescript sin re-registrar el plugin aquí.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    "tests/fixtures/**",
  ]),
]);

export default eslintConfig;
