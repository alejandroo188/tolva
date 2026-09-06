#!/usr/bin/env node
/**
 * Sirve `out/` con **las cabeceras reales de `vercel.json`**.
 *
 * Existe porque los E2E corrían contra `next dev`, donde no se aplica ninguna
 * cabecera del §9.3: la CSP sólo existía en producción y por eso un fallo que la
 * rompía del todo (React sin hidratar) pasó desapercibido en toda la batería.
 * Con esto, la CSP, COOP y COEP se prueban en local y en CI.
 *
 * Las cabeceras se leen de `vercel.json`, no se copian, para que no puedan
 * divergir de lo que se despliega.
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import process from "node:process";

const OUT = resolve(process.cwd(), "out");
const PORT = Number(process.env.PORT ?? 4173);

interface VercelConfig {
  headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
}

/** Cabeceras de la regla `/(.*)` de `vercel.json` (la que cubre todo el sitio). */
function siteHeaders(): Array<[string, string]> {
  const config = JSON.parse(
    readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
  ) as VercelConfig;
  const rule = config.headers?.find((h) => h.source === "/(.*)");
  if (!rule) throw new Error("vercel.json no tiene la regla de cabeceras /(.*)");
  return rule.headers.map((h) => [h.key, h.value] as [string, string]);
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

/** Resuelve una URL a un fichero dentro de `out/`, al estilo del export estático. */
function resolveFile(pathname: string): string | null {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const base = join(OUT, clean);
  if (!base.startsWith(OUT)) return null; // fuera de `out/`
  for (const candidate of [base, `${base}.html`, join(base, "index.html")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const headers = siteHeaders();

createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${PORT}`);
  const file = resolveFile(url.pathname);

  for (const [key, value] of headers) response.setHeader(key, value);

  if (!file) {
    const notFound = join(OUT, "404.html");
    response.writeHead(404, { "Content-Type": TYPES[".html"] });
    response.end(existsSync(notFound) ? readFileSync(notFound) : "404");
    return;
  }

  response.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  response.end(readFileSync(file));
}).listen(PORT, () => {
  console.log(`Sirviendo out/ en http://127.0.0.1:${PORT} con las cabeceras de vercel.json`);
});
