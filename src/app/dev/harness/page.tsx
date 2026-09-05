import { notFound } from "next/navigation";
import { Harness } from "@/components/dev/harness";

/**
 * Ruta sólo de desarrollo: con `output: "export"`, `notFound()` durante el
 * prerender excluye `/dev/harness` del build de producción (emite un 404).
 */
export default function DevHarnessPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <Harness />;
}
