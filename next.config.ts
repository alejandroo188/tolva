import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin funciones serverless, sin backend: la privacidad es estructural.
  output: "export",
  // `output: 'export'` no permite el optimizador de imágenes del servidor.
  images: { unoptimized: true },
};

export default nextConfig;
