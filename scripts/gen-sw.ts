#!/usr/bin/env node
/**
 * Genera `public/sw.js`: un service worker escrito a mano con un manifiesto de
 * precacheo derivado del build estático `out/`.
 *
 * Principio del §7 del plan (Hito 7): se precachea el app shell y los códecs
 * WASM en cache-first, y **jamás** se cachea un fichero de usuario (que nunca
 * entra en `out/`). Se activa en CI a partir del Hito 7.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import process from "node:process";

const OUT = resolve(process.cwd(), "out");
const PUBLIC = resolve(process.cwd(), "public");
const SW_OUT = join(PUBLIC, "sw.js");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function run(): number {
  if (!existsSync(OUT)) {
    console.error(`✗ No existe ${OUT}. Ejecuta \`npm run build\` antes.`);
    return 1;
  }

  const files = walk(OUT).map((abs) => ({
    url:
      "/" +
      abs
        .slice(OUT.length + 1)
        .split("\\")
        .join("/"),
    abs,
  }));

  const manifest = files.map(({ url, abs }) => ({
    url,
    revision: createHash("sha256").update(readFileSync(abs)).digest("hex").slice(0, 12),
  }));

  const precacheJson = JSON.stringify(manifest, null, 2);
  const sw = `/* Generado por scripts/gen-sw.ts — no editar a mano. */
const CACHE = "tolva-v1";
const PRECACHE = ${JSON.stringify(manifest)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE.map((p) => p.url))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
`;

  writeFileSync(SW_OUT, sw);
  console.log(
    `✓ ${SW_OUT} generado (${manifest.length} entradas de precacheo, ${precacheJson.length} bytes de manifiesto).`,
  );
  return 0;
}

process.exit(run());
