#!/usr/bin/env node
/**
 * Genera `THIRD_PARTY_NOTICES.md` a partir del árbol de dependencias de
 * producción. Es determinista (orden por nombre, sin rutas absolutas) para que
 * `npm run notices:check` (modo `--check`) pueda regenerar y comparar.
 *
 * Uso:
 *   node scripts/gen-third-party-notices.ts          # escribe el fichero
 *   node scripts/gen-third-party-notices.ts --check  # falla si difiere
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);
const checker = require("license-checker-rseidelsohn");

const ROOT_PACKAGE = "tolva";
const OUTPUT = resolve(process.cwd(), "THIRD_PARTY_NOTICES.md");

interface PkgInfo {
  licenses?: string;
  repository?: string;
  publisher?: string;
  licenseFile?: string;
}

function packageName(key: string): string {
  const at = key.lastIndexOf("@");
  return at > 0 ? key.slice(0, at) : key;
}

/**
 * Paquetes que NO se distribuyen y que, además, varían según la plataforma de
 * build (binarios nativos de macOS vs Linux). Excluirlos hace que el aviso sea
 * determinista entre entornos y refleje sólo lo que se sirve al usuario:
 *   - `sharp` / `@img/*`: optimizador de imágenes del servidor (desactivado).
 *   - `@next/swc-*`: binario del compilador SWC de Next (herramienta de build).
 * `@swc/helpers` y `@next/env` sí se empaquetan en el bundle y se conservan.
 */
function isExcluded(name: string): boolean {
  return name === "sharp" || name.startsWith("@img/") || name.startsWith("@next/swc-");
}

function licenseText(pkg: PkgInfo): string {
  if (pkg.licenseFile && existsSync(pkg.licenseFile)) {
    try {
      return readFileSync(pkg.licenseFile, "utf8").trim();
    } catch {
      /* cae al fallback */
    }
  }
  return `Licencia declarada en package.json como «${pkg.licenses ?? "desconocida"}»; el paquete no incluye un fichero LICENSE separado.`;
}

function render(pkgs: Record<string, PkgInfo>): string {
  const lines: string[] = [];
  lines.push("# Avisos de terceros");
  lines.push("");
  lines.push(
    "Este fichero se genera automáticamente con `npm run notices:generate` a partir del árbol de " +
      "dependencias de producción. **No lo edites a mano**: `npm run notices:check` falla en CI si " +
      "no coincide con el estado actual de `node_modules`.",
  );
  lines.push("");
  lines.push(
    "Tolva procesa imágenes y vídeo 100 % en el cliente y se distribuye bajo licencia MIT. " +
      "Las licencias de las dependencias de terceros se listan a continuación con su aviso de " +
      "copyright y su texto de licencia íntegro.",
  );
  lines.push("");

  const entries = Object.entries(pkgs)
    .filter(([key]) => {
      const name = packageName(key);
      return name !== ROOT_PACKAGE && !isExcluded(name);
    })
    .sort(([a], [b]) => packageName(a).localeCompare(packageName(b)));

  for (const [key, pkg] of entries) {
    const name = packageName(key);
    const version = key.slice(key.lastIndexOf("@") + 1);
    const license = pkg.licenses ?? "Desconocida";
    const repo = pkg.repository ?? "—";
    const publisher = pkg.publisher ?? "—";

    lines.push("---");
    lines.push("");
    lines.push(`## ${name}`);
    lines.push("");
    lines.push(`- **Versión:** ${version}`);
    lines.push(`- **Licencia:** ${license}`);
    lines.push(`- **Publicador:** ${publisher}`);
    lines.push(`- **Código fuente:** ${repo}`);
    lines.push("");
    lines.push("```text");
    lines.push(licenseText(pkg));
    lines.push("```");
    lines.push("");
  }

  lines.push("### Nota sobre herramientas de build no distribuidas");
  lines.push("");
  lines.push(
    "`sharp` y sus submódulos `@img/*` son una dependencia **opcional** de Next.js utilizada " +
      "exclusivamente por el optimizador de imágenes del servidor, y `@next/swc-*` es el binario " +
      "del compilador SWC. Tolva desactiva el optimizador (`images.unoptimized: true`) y compila a " +
      "una exportación estática (`output: 'export'`), por lo que esta cadena no se invoca, no se " +
      "empaqueta ni se distribuye. Se documenta aquí por transparencia; sus binarios varían por " +
      "plataforma (macOS/Linux) y por eso no se listan como entradas individuales.",
  );
  lines.push("");

  return lines.join("\n");
}

function run(): Promise<number> {
  return new Promise((resolve) => {
    checker.init(
      { start: process.cwd(), production: true, json: true },
      (err: Error | null, pkgs: Record<string, PkgInfo>) => {
        if (err) {
          console.error(`✗ Error al escanear dependencias: ${err.message}`);
          resolve(1);
          return;
        }
        const content = render(pkgs);

        if (process.argv.includes("--check")) {
          if (!existsSync(OUTPUT)) {
            console.error(`✗ ${OUTPUT} no existe. Ejecuta \`npm run notices:generate\`.`);
            resolve(1);
            return;
          }
          const current = readFileSync(OUTPUT, "utf8");
          if (current === content) {
            console.log("✓ THIRD_PARTY_NOTICES.md está al día.");
            resolve(0);
          } else {
            console.error(
              "✗ THIRD_PARTY_NOTICES.md no coincide con node_modules. Ejecuta `npm run notices:generate`.",
            );
            resolve(1);
          }
        } else {
          writeFileSync(OUTPUT, content);
          console.log(`✓ ${OUTPUT} generado.`);
          resolve(0);
        }
      },
    );
  });
}

process.exit(await run());
