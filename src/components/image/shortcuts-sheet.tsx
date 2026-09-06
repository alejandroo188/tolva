"use client";

import { SHORTCUTS } from "@/lib/image/shortcuts";
import { useTolva } from "@/lib/image/store";
import { Sheet } from "@/components/primitives";

const GROUP_LABELS = { general: "General", editor: "Editor" } as const;

/** Hoja de atajos de teclado, documentados en la propia UI (§8.3 recorrido 12). */
export function ShortcutsSheet() {
  const open = useTolva((s) => s.shortcutsOpen);
  const setOpen = useTolva((s) => s.setShortcutsOpen);

  const groups = (["general", "editor"] as const).map((group) => ({
    group,
    shortcuts: SHORTCUTS.filter((s) => s.group === group),
  }));

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="Atajos de teclado"
      description="Puedes usar el editor sin soltar el teclado."
    >
      <div className="flex flex-col gap-6">
        {groups.map(({ group, shortcuts }) => (
          <div key={group}>
            <h3 className="text-subheading text-text">{GROUP_LABELS[group]}</h3>
            <dl className="mt-2 divide-y divide-line rounded-panel border border-line">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <dt className="text-small text-text">{shortcut.description}</dt>
                  <dd>
                    <kbd className="rounded-control border border-line-strong bg-chrome px-2 py-1 text-caption tabular-nums text-text-secondary">
                      {shortcut.label}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
