#!/usr/bin/env node
/**
 * Guardián de licencias.
 *
 * Escanea las dependencias de PRODUCCIÓN (lo que se distribuye en el bundle) y
 * falla (exit 1) ante cualquier licencia copyleft (GPL/AGPL/LGPL), de cláusula
 * de uso restringido (SSPL/BUSL/CC-BY-NC) o paquete sin licencia declarada.
 *
 * La whitelist parte del §9.2 del plan y se amplía en dos casos documentados en
 * `docs/LEGAL_DECISIONS.md`:
 *   - CC-BY-4.0: `caniuse-lite` (dataset de soporte de navegadores, atribución
 *     obligatoria pero no viral; la atribución se da en THIRD_PARTY_NOTICES.md).
 *   - Zlib: licencia permisiva de `pako` (y de MozJPEG, ver §5.1 del plan).
 *
 * Exclusión documentada (no es un permiso tácito): `sharp` y `@img/*` son la
 * cadena OPCIONAL del optimizador de imágenes del servidor de Next. Tolva la
 * desactiva (`images.unoptimized: true`) y compila `output: 'export'`, así que
 * no se invoca, no se empaqueta ni se distribuye. Su binario nativo transitorio
 * `@img/sharp-libvips-*` (LGPL) sólo existe en `node_modules` del entorno de
 * build. Ver `docs/LEGAL_DECISIONS.md`.
 */
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const checker = require("license-checker-rseidelsohn");

const ROOT_PACKAGE = "tolva";

const ALLOWED = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MPL-2.0",
  "0BSD",
  "CC0-1.0",
  "Unlicense",
  "BlueOak-1.0.0",
  "OFL-1.1",
  // Ampliaciones documentadas en docs/LEGAL_DECISIONS.md:
  "CC-BY-4.0",
  "Zlib",
]);

const FORBIDDEN_SUBSTRINGS = ["GPL", "AGPL", "LGPL", "SSPL", "BUSL", "CC-BY-NC"];
const NO_LICENSE = new Set(["", "UNLICENSED", "UNKNOWN", "NONE", "UNKNOWN*"]);

interface PkgInfo {
  licenses?: string;
  repository?: string;
}

function packageName(key: string): string {
  const at = key.lastIndexOf("@");
  return at > 0 ? key.slice(0, at) : key;
}

function isExcluded(name: string): boolean {
  return name === "sharp" || name.startsWith("@img/");
}

/** Descompone una expresión SPDX compuesta ("MIT AND Zlib", "(A OR B)"). */
function splitExpression(expr: string): string[] {
  return expr
    .split(/\s+(?:AND|OR|WITH)\s+/i)
    .map((s) => s.replace(/[()]/g, "").replace(/\*$/, "").trim())
    .filter(Boolean);
}

function run(): Promise<number> {
  return new Promise((resolve) => {
    checker.init(
      { start: process.cwd(), production: true, json: true },
      (err: Error | null, pkgs: Record<string, PkgInfo>) => {
        if (err) {
          console.error(`✗ No se pudo escanear el árbol de dependencias: ${err.message}`);
          resolve(1);
          return;
        }

        const violations: string[] = [];
        const checked: string[] = [];
        const entries = Object.entries(pkgs);

        for (const [key, pkg] of entries) {
          const name = packageName(key);
          if (name === ROOT_PACKAGE) continue;
          if (isExcluded(name)) {
            checked.push(
              `${name} (excluida: optimizador opcional de Next, ver LEGAL_DECISIONS.md)`,
            );
            continue;
          }

          const raw = (pkg.licenses ?? "").trim();
          if (NO_LICENSE.has(raw)) {
            violations.push(`${name}: sin licencia declarada ("${raw || "vacío"}")`);
            continue;
          }

          for (const part of splitExpression(raw)) {
            const forbidden = FORBIDDEN_SUBSTRINGS.find((f) => part.toUpperCase().includes(f));
            if (forbidden) {
              violations.push(`${name}: licencia prohibida "${raw}" (coincide con ${forbidden})`);
            } else if (!ALLOWED.has(part)) {
              violations.push(`${name}: licencia no permitida "${raw}" (componente "${part}")`);
            }
          }
          checked.push(`${name} (${raw})`);
        }

        if (violations.length > 0) {
          console.error("✗ El guardián de licencias ha encontrado violaciones:");
          for (const v of violations) console.error(`  - ${v}`);
          console.error(
            "\nConsulta la skill `.claude/skills/licencias-permisivas` y `docs/LEGAL_DECISIONS.md`.",
          );
          resolve(1);
        } else {
          console.log(
            `✓ Licencias verificadas: ${checked.length} dependencias de producción revisadas, sin violaciones.`,
          );
          resolve(0);
        }
      },
    );
  });
}

process.exit(await run());
