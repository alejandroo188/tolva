"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Point, Ratio, Rect } from "@/lib/domain/types";
import { STANDARD_RATIOS } from "@/lib/domain/aspect";
import {
  centeredRectForRatio,
  clampRect,
  resizeFree,
  resizeWithLockedRatio,
} from "@/lib/domain/crop";
import type { SourceItem } from "@/lib/image/intake";
import { Button, Segmented } from "@/components/primitives";

type Handle = "nw" | "ne" | "se" | "sw";

/** Proporciones de recorte: libre + presets estándar de redes. */
const PRESETS: Array<{ value: string; label: string; ratio: Ratio | null }> = [
  { value: "free", label: "Libre", ratio: null },
  ...Object.entries(STANDARD_RATIOS).map(([label, ratio]) => ({ value: label, label, ratio })),
];

const HANDLES: Array<{ id: Handle; className: string }> = [
  { id: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2" },
  { id: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2" },
  { id: "se", className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2" },
  { id: "sw", className: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2" },
];

type DragState = {
  mode: "move" | "resize";
  handle: Handle;
  start: Point;
  startRect: Rect;
};

function clampPoint(p: Point, bounds: Rect): Point {
  return {
    x: Math.max(0, Math.min(bounds.width, p.x)),
    y: Math.max(0, Math.min(bounds.height, p.y)),
  };
}

export function CropOverlay({
  source,
  initial,
  onCommit,
  onCancel,
}: {
  source: SourceItem;
  initial: Rect | null;
  onCommit: (rect: Rect | null) => void;
  onCancel: () => void;
}) {
  const bounds: Rect = { x: 0, y: 0, width: source.width, height: source.height };
  const [rect, setRect] = useState<Rect>(() =>
    clampRect(initial ?? bounds, { width: bounds.width, height: bounds.height }),
  );
  const [preset, setPreset] = useState("free");
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);

  const ratio = PRESETS.find((p) => p.value === preset)?.ratio ?? null;
  const isFull =
    rect.width === bounds.width && rect.height === bounds.height && rect.x === 0 && rect.y === 0;

  function toSource(event: ReactPointerEvent): Point {
    const box = boxRef.current!.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * bounds.width;
    const y = ((event.clientY - box.top) / box.height) * bounds.height;
    return clampPoint({ x, y }, bounds);
  }

  function onPointerDown(event: ReactPointerEvent, mode: DragState["mode"], handle: Handle) {
    event.preventDefault();
    const point = toSource(event);
    drag.current = { mode, handle, start: point, startRect: rect };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const point = toSource(event);
    if (d.mode === "move") {
      const dx = point.x - d.start.x;
      const dy = point.y - d.start.y;
      setRect(
        clampRect(
          {
            x: d.startRect.x + dx,
            y: d.startRect.y + dy,
            width: d.startRect.width,
            height: d.startRect.height,
          },
          bounds,
        ),
      );
    } else if (ratio) {
      setRect(resizeWithLockedRatio(d.startRect, d.handle, point, ratio, bounds));
    } else {
      setRect(resizeFree(d.startRect, d.handle, point, bounds));
    }
  }

  function onPointerUp() {
    drag.current = null;
  }

  function applyPreset(value: string) {
    setPreset(value);
    const next = PRESETS.find((p) => p.value === value)?.ratio ?? null;
    if (next) setRect(centeredRectForRatio({ width: bounds.width, height: bounds.height }, next));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          aria-label="Proporción del recorte"
          size="sm"
          value={preset}
          onValueChange={applyPreset}
          options={PRESETS.map((p) => ({ value: p.value, label: p.label }))}
        />
        <span className="ml-auto text-caption tabular-nums text-text-secondary">
          {Math.round(rect.width)}×{Math.round(rect.height)}
        </span>
      </div>

      <div className="flex justify-center">
        <div
          ref={boxRef}
          className="relative select-none touch-none overflow-hidden rounded-field bg-chrome shadow-float"
          style={{
            aspectRatio: `${bounds.width} / ${bounds.height}`,
            width: `min(100%, calc(65vh * ${bounds.width / bounds.height}))`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- fuente original cargada por el usuario */}
          <img
            src={source.objectUrl}
            alt=""
            draggable={false}
            className="h-full w-full object-fill"
          />

          {/* Zona oscurecida fuera del recorte. */}
          <div className="pointer-events-none absolute inset-0 bg-backdrop" aria-hidden="true" />

          {/* Región de recorte visible. */}
          <div
            className="absolute border-2 border-accent"
            style={{
              left: `${(rect.x / bounds.width) * 100}%`,
              top: `${(rect.y / bounds.height) * 100}%`,
              width: `${(rect.width / bounds.width) * 100}%`,
              height: `${(rect.height / bounds.height) * 100}%`,
            }}
          >
            {/* Regla de los tercios. */}
            {[1, 2].map((i) => (
              <div
                key={`v${i}`}
                aria-hidden="true"
                className="absolute top-0 h-full w-px bg-surface/60"
                style={{ left: `${(i / 3) * 100}%` }}
              />
            ))}
            {[1, 2].map((i) => (
              <div
                key={`h${i}`}
                aria-hidden="true"
                className="absolute left-0 w-full h-px bg-surface/60"
                style={{ top: `${(i / 3) * 100}%` }}
              />
            ))}

            {/* Zona de arrastre (mover) + asas de esquina. */}
            <div
              className="absolute inset-0 cursor-move"
              onPointerDown={(e) => onPointerDown(e, "move", "se")}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
            {HANDLES.map(({ id, className }) => (
              <button
                key={id}
                type="button"
                aria-label={`Asa ${id}`}
                className={`absolute h-5 w-5 cursor-nwse-resize rounded-control border-2 border-accent bg-surface ${className}`}
                onPointerDown={(e) => onPointerDown(e, "resize", id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setRect(clampRect(bounds, bounds));
            setPreset("free");
          }}
        >
          Completar
        </Button>
        <Button
          onClick={() =>
            onCommit(
              isFull
                ? null
                : {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                  },
            )
          }
        >
          Aplicar
        </Button>
      </div>
    </div>
  );
}
