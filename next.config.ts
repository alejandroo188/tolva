import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin funciones serverless, sin backend: la privacidad es estructural.
  output: "export",
  // `output: 'export'` no permite el optimizador de imágenes del servidor.
  images: { unoptimized: true },
  // El `baseURL` de Playwright usa 127.0.0.1; sin esto, Next bloquea el HMR
  // cross-origin en desarrollo y llena los logs de CI de advertencias.
  allowedDevOrigins: ["127.0.0.1"],
  // Los binarios `.wasm` de jSquash no se dejan empaquetar por el bundler: se
  // sirven desde `public/codecs/` y los códecs los resuelven en tiempo de
  // ejecución vía `locateFile`/`init(ruta)` (ver `scripts/copy-codecs.ts` y
  // §8.6). Las variantes multi-threaded que colgaban a Turbopack se eliminan
  // con `patch-package` (ADR-0016).
};

export default nextConfig;
