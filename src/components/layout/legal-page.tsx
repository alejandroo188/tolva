import type { ReactNode } from "react";

/**
 * Plantilla de las rutas legales. En el Hito 2 quedan vacías (sólo el título);
 * el contenido llega en el Hito 8.
 */
export function LegalPage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-title">{title}</h1>
      {children ? (
        <div className="mt-6 max-w-prose text-body text-text-secondary">{children}</div>
      ) : null}
    </main>
  );
}
