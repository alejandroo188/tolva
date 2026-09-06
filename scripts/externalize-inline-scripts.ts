#!/usr/bin/env node
/**
 * Saca a fichero todos los `<script>` **inline** del export estático.
 *
 * Por qué existe: la CSP del §9.3 lleva `script-src 'self' 'wasm-unsafe-eval'`,
 * sin `'unsafe-inline'`. Next emite tres scripts inline en cada página (el de
 * `next-themes`, que evita el parpadeo de tema, y los dos que empujan la carga
 * útil RSC a `self.__next_f`), así que el navegador los bloquea y React nunca
 * hidrata: la página se ve, pero no responde a nada.
 *
 * Las alternativas no sirven aquí. Los `nonce` exigen render dinámico —lo dice
 * la propia documentación de Next: «Static pages are generated at build time,
 * when no request or response headers exist—so no nonce can be injected»— y
 * `output: 'export'` no lo tiene. Los hashes tampoco: la carga útil RSC cambia
 * en cada build y es distinta en cada ruta, y `vercel.json` se lee antes de
 * construir. Queda mover el código a ficheros del propio origen, que es
 * justamente lo que `'self'` autoriza.
 *
 * El orden de ejecución se conserva: un `<script src>` clásico sin `async` ni
 * `defer` se ejecuta en el orden del documento, igual que uno inline.
 *
 * Se ejecuta en `postbuild`. Idempotente.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import process from "node:process";

const OUT = resolve(process.cwd(), "out");
/** Dentro de `_next/static/` para heredar el cacheado inmutable de Next. */
const CHUNKS = join(OUT, "_next", "static", "chunks", "inline");
const PUBLIC_PREFIX = "/_next/static/chunks/inline";

/** Tipos que el navegador ejecuta (y que, por tanto, la CSP bloquea). */
const EXECUTABLE = new Set(["", "text/javascript", "application/javascript", "module"]);

/** Todos los `.html` de `out/`, recursivamente. */
function htmlFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...htmlFiles(full));
    else if (entry.endsWith(".html")) found.push(full);
  }
  return found;
}

/** `type` declarado en los atributos de la etiqueta, en minúsculas. */
function typeOf(attrs: string): string {
  const match = /\stype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs);
  return (match?.[1] ?? "").toLowerCase();
}

function main(): number {
  let pages = 0;
  let extracted = 0;
  const written = new Set<string>();

  for (const file of htmlFiles(OUT)) {
    const html = readFileSync(file, "utf8");
    let touched = false;

    const next = html.replace(
      /<script(?![^>]*\ssrc\s*=)([^>]*)>([\s\S]*?)<\/script>/gi,
      (whole, attrs: string, code: string) => {
        // `application/json` y `application/ld+json` no los ejecuta el navegador:
        // la CSP no los bloquea y sacarlos rompería a quien los lee del DOM.
        if (!EXECUTABLE.has(typeOf(attrs))) return whole;
        if (code.trim() === "") return whole;

        const hash = createHash("sha256").update(code).digest("hex").slice(0, 16);
        const name = `${hash}.js`;
        if (!written.has(name)) {
          mkdirSync(CHUNKS, { recursive: true });
          writeFileSync(join(CHUNKS, name), code, "utf8");
          written.add(name);
        }
        extracted += 1;
        touched = true;
        // Se conservan los atributos para no alterar el comportamiento de la
        // etiqueta. El separador va explícito: `attrs` puede venir vacío
        // (`<script>`) o sin espacio final, y concatenar sin él produce
        // `<scriptsrc=…>`, que el navegador no reconoce como etiqueta de script.
        const rest = attrs.trim();
        return `<script${rest ? ` ${rest}` : ""} src="${PUBLIC_PREFIX}/${name}"></script>`;
      },
    );

    if (touched) {
      writeFileSync(file, next, "utf8");
      pages += 1;
    }
  }

  // Comprobaciones de salida. La segunda existe porque una versión previa de
  // este script generaba `<scriptsrc=…>`: el HTML resultante era válido para el
  // parser (un elemento desconocido) pero no ejecutaba nada, y la comprobación
  // de «no quedan inline» pasaba igualmente.
  const leftovers: string[] = [];
  const malformed: string[] = [];
  for (const file of htmlFiles(OUT)) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/<script(?![^>]*\ssrc\s*=)([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (EXECUTABLE.has(typeOf(match[1])) && match[2].trim() !== "") {
        leftovers.push(relative(OUT, file));
      }
    }
    if (/<script[^\s>/]/i.test(html)) malformed.push(relative(OUT, file));
  }

  if (malformed.length > 0) {
    console.error("✗ Etiquetas <script> mal formadas en:", [...new Set(malformed)].join(", "));
    return 1;
  }
  if (leftovers.length > 0) {
    console.error("✗ Quedan scripts inline ejecutables en:", [...new Set(leftovers)].join(", "));
    return 1;
  }

  console.log(
    `✓ ${extracted} scripts inline extraídos a ${written.size} ficheros en ` +
      `${PUBLIC_PREFIX}/ (${pages} páginas reescritas); ninguno queda inline.`,
  );
  return 0;
}

process.exit(main());
