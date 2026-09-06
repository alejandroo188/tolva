"use client";

import { useTolva } from "@/lib/image/store";
import { getAdjust, setAdjust } from "@/lib/image/draft";
import { Slider, Switch } from "@/components/primitives";

function SliderRow({
  label,
  value,
  onChange,
  ariaLabel,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-small text-text-secondary">{label}</span>
      <Slider
        aria-label={ariaLabel}
        min={-100}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="w-12 shrink-0 text-right text-caption tabular-nums text-text-secondary">
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

/** Ajustes de color (brillo, contraste, saturación, temperatura, grises). */
export function AdjustPanel() {
  const source = useTolva((s) => s.sources.find((src) => src.id === s.selectedId));
  const draft = useTolva((s) => (s.selectedId ? s.drafts[s.selectedId] : undefined));
  const updateDraft = useTolva((s) => s.updateDraft);

  if (!source || !draft) return null;

  const adjust = getAdjust(draft.ops);
  const patch = (value: Partial<Omit<typeof adjust, "type">>) =>
    updateDraft(source.id, { ops: setAdjust(draft.ops, value) });

  return (
    <section
      aria-label="Ajustes de color"
      className="rounded-panel border border-line bg-surface p-5"
    >
      <h2 className="text-heading text-text">Color</h2>
      <div className="mt-4 flex flex-col gap-4">
        <SliderRow
          label="Brillo"
          value={adjust.brightness}
          ariaLabel="Brillo"
          onChange={(brightness) => patch({ brightness })}
        />
        <SliderRow
          label="Contraste"
          value={adjust.contrast}
          ariaLabel="Contraste"
          onChange={(contrast) => patch({ contrast })}
        />
        <SliderRow
          label="Saturación"
          value={adjust.saturation}
          ariaLabel="Saturación"
          onChange={(saturation) => patch({ saturation })}
        />
        <SliderRow
          label="Temperatura"
          value={adjust.temperature}
          ariaLabel="Temperatura"
          onChange={(temperature) => patch({ temperature })}
        />
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-small text-text-secondary">Escala de grises</span>
          <Switch
            aria-label="Escala de grises"
            checked={adjust.grayscale}
            onCheckedChange={(grayscale) => patch({ grayscale })}
          />
        </div>
      </div>
    </section>
  );
}
