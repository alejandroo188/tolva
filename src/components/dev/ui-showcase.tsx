"use client";

import { useState, type ReactNode } from "react";
import { Info, Trash2, Upload } from "lucide-react";
import {
  Button,
  IconButton,
  ListGroup,
  ListItem,
  ProgressBar,
  Segmented,
  Sheet,
  Slider,
  Switch,
  Toast,
  Tooltip,
} from "@/components/primitives";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-panel border border-line p-6">
      <h2 className="text-heading text-text">{title}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

export function UiShowcase() {
  const [segmented, setSegmented] = useState<"imagen" | "video" | "lote">("imagen");
  const [switchOn, setSwitchOn] = useState(true);
  const [slider, setSlider] = useState(40);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-title text-text">Primitivos</h1>
      <p className="mt-2 max-w-prose text-body text-text-secondary">
        Todos los primitivos del sistema, en todos sus estados. Cambia el tema desde la cabecera
        para revisar claro y oscuro.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <Section title="La cifra (elemento héroe)">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-display tabular-nums text-text">34,7&nbsp;MB</span>
            <span className="text-body text-accent" aria-hidden="true">
              →
            </span>
            <span className="text-display tabular-nums text-text">1,9&nbsp;MB</span>
            <span className="text-body text-success">−94&nbsp;%</span>
          </div>
          <ProgressBar value={94} aria-label="Ahorro de peso" className="mt-2 w-full max-w-xs" />
        </Section>

        <Section title="Button">
          <Button>Convertir</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="ghost">Restablecer</Button>
          <Button variant="danger">Eliminar</Button>
          <Button size="sm">Pequeño</Button>
          <Button size="lg">Grande</Button>
          <Button disabled>Deshabilitado</Button>
          <Button variant="secondary">
            <Upload aria-hidden="true" className="h-4 w-4" />
            Con icono
          </Button>
        </Section>

        <Section title="IconButton">
          <IconButton
            aria-label="Información"
            icon={<Info aria-hidden="true" className="h-5 w-5" />}
          />
          <IconButton
            aria-label="Eliminar"
            variant="secondary"
            icon={<Trash2 aria-hidden="true" className="h-5 w-5" />}
          />
          <IconButton
            aria-label="Subir"
            variant="primary"
            icon={<Upload aria-hidden="true" className="h-5 w-5" />}
          />
          <IconButton
            aria-label="Eliminar (deshabilitado)"
            disabled
            icon={<Trash2 aria-hidden="true" className="h-5 w-5" />}
          />
        </Section>

        <Section title="Segmented">
          <Segmented
            aria-label="Modo"
            value={segmented}
            onValueChange={setSegmented}
            options={[
              { value: "imagen", label: "Imagen" },
              { value: "video", label: "Vídeo" },
              { value: "lote", label: "Lote" },
            ]}
          />
          <Segmented
            aria-label="Tamaño"
            size="sm"
            value={segmented}
            onValueChange={setSegmented}
            options={[
              { value: "imagen", label: "Imagen" },
              { value: "video", label: "Vídeo" },
              { value: "lote", label: "Lote" },
            ]}
          />
        </Section>

        <Section title="Switch">
          <Switch aria-label="Metadatos" checked={switchOn} onCheckedChange={setSwitchOn} />
          <Switch
            aria-label="Metadatos (pequeño)"
            size="sm"
            checked={switchOn}
            onCheckedChange={setSwitchOn}
          />
          <Switch
            aria-label="Metadatos (deshabilitado)"
            checked={false}
            onCheckedChange={() => {}}
            disabled
          />
        </Section>

        <Section title="Slider">
          <div className="w-full max-w-xs">
            <Slider
              aria-label="Calidad"
              min={0}
              max={100}
              value={slider}
              onChange={(event) => setSlider(Number(event.target.value))}
            />
          </div>
        </Section>

        <Section title="ProgressBar">
          <div className="flex w-full max-w-xs flex-col gap-3">
            <ProgressBar value={0} aria-label="Sin progreso" />
            <ProgressBar value={25} aria-label="Cuarto" />
            <ProgressBar value={50} aria-label="Mitad" />
            <ProgressBar value={100} aria-label="Completo" />
          </div>
        </Section>

        <Section title="Toast">
          <Toast>Conversión completada.</Toast>
          <Toast tone="success">Ahorro del 94&nbsp;%.</Toast>
          <Toast tone="danger">No se pudo leer el fichero.</Toast>
        </Section>

        <Section title="Tooltip">
          <Tooltip label="Convierte sin salir del navegador">
            <Button variant="secondary">Pasa el ratón o enfoca</Button>
          </Tooltip>
        </Section>

        <Section title="ListGroup">
          <div className="w-full max-w-xs">
            <ListGroup>
              <ListItem>Avatar — 1:1</ListItem>
              <ListItem>Historia — 9:16</ListItem>
              <ListItem>Miniatura — 16:9</ListItem>
            </ListGroup>
          </div>
        </Section>

        <Section title="Sheet">
          <Button onClick={() => setSheetOpen(true)}>Abrir hoja</Button>
          <Sheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            title="Ajustes de exportación"
            description="Estos valores se aplican a todos los ficheros del lote."
          >
            <div className="flex flex-col gap-4">
              <Switch
                aria-label="Borrar metadatos"
                checked={switchOn}
                onCheckedChange={setSwitchOn}
              />
              <Slider
                aria-label="Calidad de la hoja"
                min={0}
                max={100}
                value={slider}
                onChange={(event) => setSlider(Number(event.target.value))}
              />
              <Button onClick={() => setSheetOpen(false)}>Listo</Button>
            </div>
          </Sheet>
        </Section>
      </div>
    </main>
  );
}
