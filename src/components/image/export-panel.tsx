"use client";

import { useTolva } from "@/lib/image/store";
import { OUTPUT_FORMATS, isLosslessFormat } from "@/lib/domain/quality";
import type { OutputFormat } from "@/lib/domain/types";
import { Segmented, Slider, Switch } from "@/components/primitives";

const FORMAT_LABELS: Record<OutputFormat, string> = {
  jpeg: "JPEG",
  png: "PNG",
  webp: "WebP",
  avif: "AVIF",
  jxl: "JXL",
  gif: "GIF",
  bmp: "BMP",
};

/** Ajustes de salida: formato, calidad y metadatos. Se persisten y se aplican
 *  a todos los borradores (lote con los mismos ajustes). */
export function ExportPanel() {
  const prefs = useTolva((s) => s.prefs);
  const setOutput = useTolva((s) => s.setOutput);

  const lossless = isLosslessFormat(prefs.outputFormat);

  return (
    <section
      aria-label="Ajustes de exportación"
      className="rounded-panel border border-line bg-surface p-5"
    >
      <h2 className="text-heading text-text">Exportar</h2>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <span className="text-small text-text-secondary">Formato</span>
          <div className="mt-2">
            <Segmented
              aria-label="Formato de salida"
              value={prefs.outputFormat}
              onValueChange={(format) => setOutput({ format })}
              options={OUTPUT_FORMATS.map((format) => ({
                value: format,
                label: FORMAT_LABELS[format],
              }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-small text-text-secondary">Calidad</span>
          <Slider
            aria-label="Calidad"
            min={0}
            max={100}
            value={prefs.quality}
            onChange={(event) => setOutput({ quality: Number(event.target.value) })}
          />
          <span className="w-12 shrink-0 text-right text-caption tabular-nums text-text-secondary">
            {prefs.quality}
          </span>
        </div>
        {lossless ? (
          <p className="text-caption text-text-muted">
            PNG y BMP son sin pérdida: la calidad sólo ajusta el esfuerzo de compresión.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <div>
            <span className="text-small text-text-secondary">Eliminar metadatos</span>
            <p className="text-caption text-text-muted">Quita EXIF, GPS y datos de la cámara.</p>
          </div>
          <Switch
            aria-label="Eliminar metadatos"
            checked={prefs.stripMetadata}
            onCheckedChange={(stripMetadata) => setOutput({ stripMetadata })}
          />
        </div>
      </div>
    </section>
  );
}
