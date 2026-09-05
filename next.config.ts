import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin funciones serverless, sin backend: la privacidad es estructural.
  output: "export",
  // `output: 'export'` no permite el optimizador de imágenes del servidor.
  images: { unoptimized: true },
  // El `baseURL` de Playwright usa 127.0.0.1; sin esto, Next bloquea el HMR
  // cross-origin en desarrollo y llena los logs de CI de advertencias.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
