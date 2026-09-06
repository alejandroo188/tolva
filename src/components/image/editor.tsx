"use client";

import { Crop, FlipHorizontal, FlipVertical, RotateCcw, RotateCw, Undo2 } from "lucide-react";
import { useTolva } from "@/lib/image/store";
import {
  getCrop,
  getFlips,
  getRotation,
  getStraighten,
  hasOps,
  setCrop,
  setRotation,
  setStraighten,
  toggleFlip,
  type Rotation,
} from "@/lib/image/draft";
import { IconButton, Slider, Tooltip } from "@/components/primitives";
import { CropOverlay } from "./crop-overlay";
import { Comparator } from "./comparator";

const ROTATE_LABELS: Record<Rotation, string> = {
  0: "Sin rotación",
  90: "90°",
  180: "180°",
  270: "270°",
};

/**
 * Editor de imagen: vista previa (o comparador antes/después), superposición de
 * recorte y barra de herramientas (rotar, voltear, enderezar, restablecer). La
 * vista previa es el resultado del worker con las operaciones aplicadas.
 */
export function Editor({
  cropMode,
  setCropMode,
  beforeAfter,
  setBeforeAfter,
}: {
  cropMode: boolean;
  setCropMode: (v: boolean) => void;
  beforeAfter: boolean;
  setBeforeAfter: (v: boolean) => void;
}) {
  const source = useTolva((s) => s.sources.find((src) => src.id === s.selectedId));
  const draft = useTolva((s) => (s.selectedId ? s.drafts[s.selectedId] : undefined));
  const preview = useTolva((s) => (s.selectedId ? s.previews[s.selectedId] : undefined));
  const updateDraft = useTolva((s) => s.updateDraft);

  if (!source || !draft) return null;

  const ops = draft.ops;
  const rotation = getRotation(ops);
  const straighten = getStraighten(ops);
  const flips = getFlips(ops);
  const crop = getCrop(ops);

  const patch = (next: typeof ops) => updateDraft(source.id, { ops: next });

  return (
    <section aria-label="Editor" className="flex flex-col gap-4">
      {/* Barra de herramientas. */}
      <div className="flex flex-wrap items-center gap-1">
        <Tooltip label="Recortar (C)">
          <IconButton
            aria-label="Recortar"
            icon={<Crop aria-hidden="true" className="h-5 w-5" />}
            variant={cropMode ? "secondary" : "ghost"}
            onClick={() => setCropMode(!cropMode)}
          />
        </Tooltip>
        <Tooltip label="Rotar 90° a la derecha (R)">
          <IconButton
            aria-label="Rotar 90° a la derecha"
            icon={<RotateCw aria-hidden="true" className="h-5 w-5" />}
            onClick={() => patch(setRotation(ops, ((rotation + 90) % 360) as Rotation))}
          />
        </Tooltip>
        <Tooltip label="Rotar 90° a la izquierda (Shift R)">
          <IconButton
            aria-label="Rotar 90° a la izquierda"
            icon={<RotateCcw aria-hidden="true" className="h-5 w-5" />}
            onClick={() => patch(setRotation(ops, ((rotation + 270) % 360) as Rotation))}
          />
        </Tooltip>
        <Tooltip label="Voltear horizontal (H)">
          <IconButton
            aria-label="Voltear horizontal"
            icon={<FlipHorizontal aria-hidden="true" className="h-5 w-5" />}
            variant={flips.horizontal ? "secondary" : "ghost"}
            onClick={() => patch(toggleFlip(ops, "horizontal"))}
          />
        </Tooltip>
        <Tooltip label="Voltear vertical (V)">
          <IconButton
            aria-label="Voltear vertical"
            icon={<FlipVertical aria-hidden="true" className="h-5 w-5" />}
            variant={flips.vertical ? "secondary" : "ghost"}
            onClick={() => patch(toggleFlip(ops, "vertical"))}
          />
        </Tooltip>
        <Tooltip label="Restablecer ajustes (0)">
          <IconButton
            aria-label="Restablecer ajustes"
            icon={<Undo2 aria-hidden="true" className="h-5 w-5" />}
            disabled={!hasOps(ops)}
            onClick={() => patch([])}
          />
        </Tooltip>

        <span className="mx-2 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-caption text-text-secondary">Enderezar</span>
          <Slider
            aria-label="Enderezar (grados)"
            min={-45}
            max={45}
            step={0.5}
            value={straighten}
            onChange={(event) => patch(setStraighten(ops, Number(event.target.value)))}
          />
          <span className="w-12 text-right text-caption tabular-nums text-text-secondary">
            {straighten}°
          </span>
        </div>

        <span className="mx-2 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />

        <button
          type="button"
          className={`rounded-control px-3 py-1.5 text-small font-medium transition-colors ${
            beforeAfter ? "bg-accent-subtle text-text" : "text-text-secondary hover:text-text"
          }`}
          onClick={() => setBeforeAfter(!beforeAfter)}
          disabled={!preview}
        >
          Antes / Después
        </button>
        <span className="text-caption text-text-muted">Rotación: {ROTATE_LABELS[rotation]}</span>
      </div>

      {/* Vista previa / recorte / comparador. */}
      <div className="flex min-h-80 flex-1 items-center justify-center overflow-hidden rounded-panel border border-line bg-chrome p-4">
        {cropMode ? (
          <CropOverlay
            source={source}
            initial={crop}
            onCommit={(rect) => {
              patch(setCrop(ops, rect));
              setCropMode(false);
            }}
            onCancel={() => setCropMode(false)}
          />
        ) : preview ? (
          beforeAfter ? (
            <Comparator before={source.objectUrl} after={preview.url} alt={source.name} />
          ) : (
            <div className="relative h-full max-h-[70vh] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- resultado del worker servido como objectURL */}
              <img
                src={preview.url}
                alt={`Vista previa de ${source.name}`}
                className="h-full w-full object-contain"
                draggable={false}
              />
            </div>
          )
        ) : (
          <p className="text-small text-text-secondary">Preparando vista previa…</p>
        )}
      </div>
    </section>
  );
}
