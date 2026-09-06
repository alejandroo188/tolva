"use client";

import { useEffect, useState } from "react";
import { useTolva } from "@/lib/image/store";
import { findShortcut } from "@/lib/image/shortcuts";
import {
  getAdjust,
  getRotation,
  setAdjust,
  setRotation,
  toggleFlip,
  type Rotation,
} from "@/lib/image/draft";
import { Dropzone } from "./dropzone";
import { SourceStrip } from "./source-strip";
import { Button } from "@/components/primitives";
import { Editor } from "./editor";
import { WeightPanel } from "./weight-panel";
import { AdjustPanel } from "./adjust-panel";
import { WatermarkPanel } from "./watermark-panel";
import { ResizePanel } from "./resize-panel";
import { ExportPanel } from "./export-panel";
import { Queue } from "./queue";
import { ShortcutsSheet } from "./shortcuts-sheet";
import { DegradationBanner } from "./degradation-banner";

/**
 * Composición de la interfaz de imagen: zona de arrastre, selector, editor,
 * paneles y cola. También conecta el teclado con las acciones del editor y
 * muestra la hoja de atajos (§8.3 recorrido 12).
 */
export function ImageApp() {
  const hasSources = useTolva((s) => s.sources.length > 0);
  const selectedId = useTolva((s) => s.selectedId);
  const [cropMode, setCropMode] = useState(false);
  const [beforeAfter, setBeforeAfter] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      const shortcut = findShortcut({
        key: event.key,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        isEditable,
      });
      if (!shortcut) return;

      event.preventDefault();
      const s = useTolva.getState();
      const id = s.selectedId;

      switch (shortcut.id) {
        case "shortcuts":
          s.setShortcutsOpen(!s.shortcutsOpen);
          return;
        case "crop":
          if (id) setCropMode((v) => !v);
          return;
        case "reset":
          if (id) s.updateDraft(id, { ops: [] });
          return;
      }

      if (!id) return;
      const draft = s.drafts[id];
      if (!draft) return;
      const ops = draft.ops;

      switch (shortcut.id) {
        case "rotate":
          s.updateDraft(id, { ops: setRotation(ops, ((getRotation(ops) + 90) % 360) as Rotation) });
          return;
        case "rotate-ccw":
          s.updateDraft(id, {
            ops: setRotation(ops, ((getRotation(ops) + 270) % 360) as Rotation),
          });
          return;
        case "flip-h":
          s.updateDraft(id, { ops: toggleFlip(ops, "horizontal") });
          return;
        case "flip-v":
          s.updateDraft(id, { ops: toggleFlip(ops, "vertical") });
          return;
        case "grayscale": {
          const adjust = getAdjust(ops);
          s.updateDraft(id, { ops: setAdjust(ops, { grayscale: !adjust.grayscale }) });
          return;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      {!hasSources ? (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
          <Dropzone />
        </main>
      ) : (
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-4">
            <DegradationBanner />
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <SourceStrip />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => useTolva.getState().setShortcutsOpen(true)}
              >
                Atajos
              </Button>
            </div>
            <Dropzone />
          </div>

          <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-6">
              <WeightPanel />
              <Editor
                cropMode={cropMode}
                setCropMode={setCropMode}
                beforeAfter={beforeAfter}
                setBeforeAfter={setBeforeAfter}
              />
            </div>
            <aside className="flex min-w-0 flex-col gap-6">
              <ExportPanel />
              <ResizePanel key={selectedId} />
              <AdjustPanel />
              <WatermarkPanel />
            </aside>
          </div>

          <Queue />
        </main>
      )}

      <ShortcutsSheet />
    </>
  );
}
