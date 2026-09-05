import { notFound } from "next/navigation";
import { UiShowcase } from "@/components/dev/ui-showcase";

/**
 * Ruta sólo de desarrollo: excluida del build de producción. Con
 * `output: "export"`, `notFound()` durante el prerender hace que Next no emita
 * `/dev/ui` en `out/` (y sí un 404).
 */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <UiShowcase />;
}
