"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import type { WatermarkOp, WatermarkPosition } from "@/lib/domain/types";
import { useTolva } from "@/lib/image/store";
import { getWatermark, setWatermark } from "@/lib/image/draft";
import { Button, Segmented, Slider, Switch } from "@/components/primitives";

const POSITIONS: WatermarkPosition[] = ["nw", "n", "ne", "w", "center", "e", "sw", "s", "se"];

const POSITION_LABELS: Record<WatermarkPosition, string> = {
  nw: "arriba izquierda",
  n: "arriba centro",
  ne: "arriba derecha",
  w: "centro izquierda",
  center: "centro",
  e: "centro derecha",
  sw: "abajo izquierda",
  s: "abajo centro",
  se: "abajo derecha",
};

/** Marca de agua de texto o imagen, con opacidad y posición en cuadrícula 3×3. */
export function WatermarkPanel() {
  const source = useTolva((s) => s.sources.find((src) => src.id === s.selectedId));
  const draft = useTolva((s) => (s.selectedId ? s.drafts[s.selectedId] : undefined));
  const updateDraft = useTolva((s) => s.updateDraft);
  const imageInput = useRef<HTMLInputElement>(null);

  const watermark = getWatermark(draft?.ops ?? []);
  const [kind, setKind] = useState<"text" | "image">(watermark?.kind ?? "text");

  if (!source || !draft) return null;

  const apply = (next: WatermarkOp | null) =>
    updateDraft(source.id, { ops: setWatermark(draft.ops, next) });

  const enabled = watermark != null;
  const opacity = Math.round((watermark?.opacity ?? 0.6) * 100);

  const setEnabled = (on: boolean) => {
    if (!on) return apply(null);
    apply({ type: "watermark", kind: "text", text: "Tolva", opacity: 0.6, position: "se" });
  };

  const pickKind = (next: "text" | "image") => {
    setKind(next);
    if (!watermark) return;
    if (next === "text" && watermark.kind === "image") {
      apply({
        type: "watermark",
        kind: "text",
        text: "Tolva",
        opacity: watermark.opacity,
        position: watermark.position,
      });
    }
    // Para "image": se espera a elegir un logo; no se crea una op inválida.
  };

  const setField = (patch: { opacity?: number; position?: WatermarkPosition; text?: string }) => {
    if (!watermark) return;
    apply({ ...watermark, ...patch } as WatermarkOp);
  };

  return (
    <section aria-label="Marca de agua" className="rounded-panel border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-heading text-text">Marca de agua</h2>
        <Switch aria-label="Activar marca de agua" checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled ? (
        <div className="mt-4 flex flex-col gap-4">
          <Segmented
            aria-label="Tipo de marca"
            size="sm"
            value={kind}
            onValueChange={pickKind}
            options={[
              { value: "text", label: "Texto" },
              { value: "image", label: "Imagen" },
            ]}
          />

          {kind === "text" ? (
            <label className="flex flex-col gap-1">
              <span className="text-small text-text-secondary">Texto</span>
              <input
                type="text"
                value={watermark.kind === "text" ? watermark.text : ""}
                onChange={(event) => setField({ text: event.target.value })}
                placeholder="Tu marca"
                className="rounded-field border border-line-strong bg-surface px-3 py-2 text-body text-text placeholder:text-text-muted focus-visible:outline-none"
              />
            </label>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => imageInput.current?.click()}>
                <ImagePlus aria-hidden="true" className="h-4 w-4" />
                Elegir logo
              </Button>
              <span className="truncate text-small text-text-secondary">
                {watermark.kind === "image" && watermark.imageDataUrl ? "Logo cargado" : "Sin logo"}
              </span>
              <input
                ref={imageInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () =>
                    apply({
                      type: "watermark",
                      kind: "image",
                      imageDataUrl: String(reader.result),
                      opacity: watermark?.opacity ?? 0.6,
                      position: watermark?.position ?? "se",
                    });
                  reader.readAsDataURL(file);
                  event.target.value = "";
                }}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-small text-text-secondary">Opacidad</span>
            <Slider
              aria-label="Opacidad de la marca"
              min={0}
              max={100}
              value={opacity}
              onChange={(event) => setField({ opacity: Number(event.target.value) / 100 })}
            />
            <span className="w-12 shrink-0 text-right text-caption tabular-nums text-text-secondary">
              {opacity}%
            </span>
          </div>

          <div>
            <span className="text-small text-text-secondary">Posición</span>
            <div
              role="radiogroup"
              aria-label="Posición de la marca"
              className="mt-2 grid w-fit grid-cols-3 gap-1"
            >
              {POSITIONS.map((position) => (
                <button
                  key={position}
                  type="button"
                  role="radio"
                  aria-checked={watermark.position === position}
                  aria-label={POSITION_LABELS[position]}
                  onClick={() => setField({ position })}
                  className={`flex h-9 w-9 items-center justify-center rounded-control border transition-colors ${
                    watermark.position === position
                      ? "border-accent bg-accent-subtle"
                      : "border-line hover:border-line-strong"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-text-secondary" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-small text-text-secondary">
          Añade un texto o un logo sobre la imagen, con opacidad y posición a elegir.
        </p>
      )}
    </section>
  );
}
