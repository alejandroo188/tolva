"use client";

import { useState } from "react";
import type { ResizeMode } from "@/lib/domain/types";
import { useTolva } from "@/lib/image/store";
import { getResize, setResize } from "@/lib/image/draft";
import { Segmented, Slider, Switch } from "@/components/primitives";

const MODES: ResizeMode[] = ["fit", "cover", "fill"];

const MODE_LABELS: Record<ResizeMode, string> = {
  fit: "Ajustar",
  cover: "Cubrir",
  fill: "Estirar",
  contain: "Ajustar",
};

/** Redimensionado por píxeles o por porcentaje, con «no ampliar» respetado (§8.3 recorrido 3). */
export function ResizePanel() {
  const source = useTolva((s) => s.sources.find((src) => src.id === s.selectedId));
  const draft = useTolva((s) => (s.selectedId ? s.drafts[s.selectedId] : undefined));
  const updateDraft = useTolva((s) => s.updateDraft);

  const resize = getResize(draft?.ops ?? []);
  const [unit, setUnit] = useState<"pixels" | "percent">("pixels");
  const [width, setWidth] = useState(resize?.width ?? source?.width ?? 1);
  const [height, setHeight] = useState(resize?.height ?? source?.height ?? 1);
  const [mode, setMode] = useState<ResizeMode>(resize?.mode ?? "fit");
  const [noAmpliar, setNoAmpliar] = useState(resize ? !resize.upscale : true);
  const [percent, setPercent] = useState(() =>
    source && resize && source.width > 0 ? Math.round((resize.width / source.width) * 100) : 100,
  );

  if (!source || !draft) return null;

  const enabled = resize != null;

  const commit = (next: Parameters<typeof setResize>[1]) =>
    updateDraft(source.id, { ops: setResize(draft.ops, next) });

  const commitPixels = (w: number, h: number, m: ResizeMode, noUpscale: boolean) =>
    commit({
      type: "resize",
      width: Math.max(1, Math.round(w)),
      height: Math.max(1, Math.round(h)),
      mode: m,
      upscale: !noUpscale,
    });

  const commitPercent = (pct: number, noUpscale: boolean) =>
    commit({
      type: "resize",
      width: Math.max(1, Math.round((source.width * pct) / 100)),
      height: Math.max(1, Math.round((source.height * pct) / 100)),
      mode: "fill",
      upscale: !noUpscale,
    });

  const setEnabled = (on: boolean) => {
    if (!on) return commit(null);
    if (unit === "pixels") commitPixels(width, height, mode, noAmpliar);
    else commitPercent(percent, noAmpliar);
  };

  const shownWidth =
    unit === "pixels" ? width : Math.max(1, Math.round((source.width * percent) / 100));
  const shownHeight =
    unit === "pixels" ? height : Math.max(1, Math.round((source.height * percent) / 100));

  return (
    <section aria-label="Tamaño" className="rounded-panel border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-heading text-text">Tamaño</h2>
        <Switch aria-label="Redimensionar" checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled ? (
        <div className="mt-4 flex flex-col gap-4">
          <Segmented
            aria-label="Unidad de redimensionado"
            size="sm"
            value={unit}
            onValueChange={(value) => {
              setUnit(value);
              if (value === "pixels") commitPixels(width, height, mode, noAmpliar);
              else commitPercent(percent, noAmpliar);
            }}
            options={[
              { value: "pixels", label: "Píxeles" },
              { value: "percent", label: "Porcentaje" },
            ]}
          />

          {unit === "pixels" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-small text-text-secondary">Ancho (px)</span>
                  <input
                    type="number"
                    min={1}
                    value={width}
                    onChange={(event) => {
                      const w = Number(event.target.value);
                      setWidth(w);
                      if (Number.isFinite(w) && w > 0) commitPixels(w, height, mode, noAmpliar);
                    }}
                    className="rounded-field border border-line-strong bg-surface px-3 py-2 text-body text-text"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-small text-text-secondary">Alto (px)</span>
                  <input
                    type="number"
                    min={1}
                    value={height}
                    onChange={(event) => {
                      const h = Number(event.target.value);
                      setHeight(h);
                      if (Number.isFinite(h) && h > 0) commitPixels(width, h, mode, noAmpliar);
                    }}
                    className="rounded-field border border-line-strong bg-surface px-3 py-2 text-body text-text"
                  />
                </label>
              </div>
              <Segmented
                aria-label="Modo de ajuste"
                size="sm"
                value={mode}
                onValueChange={(m) => {
                  setMode(m);
                  commitPixels(width, height, m, noAmpliar);
                }}
                options={MODES.map((m) => ({ value: m, label: MODE_LABELS[m] }))}
              />
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-small text-text-secondary">Porcentaje</span>
              <Slider
                aria-label="Porcentaje de tamaño"
                min={10}
                max={200}
                value={percent}
                onChange={(event) => {
                  const pct = Number(event.target.value);
                  setPercent(pct);
                  commitPercent(pct, noAmpliar);
                }}
              />
              <span className="w-12 shrink-0 text-right text-caption tabular-nums text-text-secondary">
                {percent}%
              </span>
            </div>
          )}

          <p className="text-caption tabular-nums text-text-muted">
            Resultado: {shownWidth}×{shownHeight} px
          </p>

          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <span className="text-small text-text-secondary">No ampliar</span>
            <Switch
              aria-label="No ampliar"
              checked={noAmpliar}
              onCheckedChange={(checked) => {
                setNoAmpliar(checked);
                if (unit === "pixels") commitPixels(width, height, mode, checked);
                else commitPercent(percent, checked);
              }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-2 text-small text-text-secondary">
          Cambia el tamaño por píxeles o porcentaje, o deja el original.
        </p>
      )}
    </section>
  );
}
