import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tolva — Convierte imágenes y vídeo en tu navegador",
  description:
    "Conversión y edición de imágenes y vídeo, 100% en el navegador. Sin subidas, sin servidor, sin límites de tamaño.",
  applicationName: "Tolva",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
