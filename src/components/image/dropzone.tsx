"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { useTolva } from "@/lib/image/store";
import type { IntakeFailure } from "@/lib/image/intake";
import { Button, Toast } from "@/components/primitives";

/**
 * Zona de arrastre. A pantalla completa cuando no hay fuentes; una barra
 * compacta para añadir más cuando ya las hay. También acepta pegado desde el
 * portapapeles (§8.3) y un selector de ficheros.
 */
export function Dropzone() {
  const addFiles = useTolva((s) => s.addFiles);
  const hasSources = useTolva((s) => s.sources.length > 0);
  const [dragActive, setDragActive] = useState(false);
  const [failures, setFailures] = useState<IntakeFailure[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const result = await addFiles(files);
      if (result.length > 0) setFailures((prev) => [...prev, ...result]);
    },
    [addFiles],
  );

  // Pega una imagen desde el portapapeles.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const items = event.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        event.preventDefault();
        void handleFiles(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFiles]);

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) void handleFiles(files);
  }

  const openPicker = () => inputRef.current?.click();

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.svg,.tif,.tiff"
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) void handleFiles(files);
          event.target.value = "";
        }}
      />

      {!hasSources ? (
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            dragDepth.current += 1;
            setDragActive(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => {
            dragDepth.current -= 1;
            if (dragDepth.current <= 0) setDragActive(false);
          }}
          onDrop={onDrop}
          className={`flex flex-1 flex-col items-center justify-center rounded-surface border-2 border-dashed px-6 py-16 text-center transition-colors ${
            dragActive ? "border-accent bg-accent-subtle" : "border-line-strong"
          }`}
        >
          <Upload aria-hidden="true" className="h-10 w-10 text-text-muted" />
          <h1 className="mt-4 text-subheading text-text">
            Arrastra una imagen aquí, pégala o elige un fichero
          </h1>
          <p className="mt-2 max-w-md text-small text-text-secondary">
            Se convierte y edita en tu navegador. Nada se sube a ningún servidor.
          </p>
          <Button className="mt-6" onClick={openPicker}>
            Elegir imágenes
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full items-center justify-center gap-2 rounded-panel border border-dashed border-line-strong px-4 py-3 text-small text-text-secondary transition-colors hover:border-accent hover:text-text"
        >
          <Upload aria-hidden="true" className="h-4 w-4" />
          Añadir más imágenes (o pégalas)
        </button>
      )}

      {failures.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {failures.map((failure, index) => (
            <Toast key={`${failure.code}-${index}`} tone="danger">
              <div className="flex items-start justify-between gap-3">
                <span>{failure.reason}</span>
                <button
                  type="button"
                  className="text-caption text-text-muted underline-offset-2 hover:underline"
                  onClick={() => setFailures((prev) => prev.filter((_, i) => i !== index))}
                >
                  Descartar
                </button>
              </div>
            </Toast>
          ))}
        </div>
      ) : null}
    </>
  );
}
