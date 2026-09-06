"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./icon-button";

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Hoja modal que sube desde abajo, sobre `<dialog>` nativo: foco atrapado y
 * cierre con `Esc` gratis. El scrim vive en `dialog::backdrop` (globals.css).
 */
export function Sheet({ open, onOpenChange, title, description, children, className }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={() => onOpenChange(false)}
      className={cn(
        // `open:flex` en vez de `flex`: el `display:flex` del autor anularía el
        // `display:none` que el UA aplica a `<dialog>` cerrado, dejando la hoja
        // visible tras `close()`. Con la variante `open:` sólo hay `flex` cuando
        // `[open]` está presente; al cerrar, el diálogo vuelve a `display:none`.
        "m-0 mb-0 mt-auto mx-auto w-full max-w-lg flex-col overflow-hidden open:flex",
        "rounded-t-sheet border border-line-strong bg-surface text-text shadow-sheet",
        "max-h-dvh",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div className="min-w-0">
          <h2 id={titleId} className="text-heading">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-small text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        <IconButton
          aria-label="Cerrar"
          icon={<X aria-hidden="true" className="h-5 w-5" />}
          onClick={() => onOpenChange(false)}
          className="-mr-2 -mt-1"
        />
      </div>
      <div className="overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  );
}
