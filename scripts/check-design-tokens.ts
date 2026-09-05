#!/usr/bin/env node
/**
 * Guardián del sistema de diseño (§7, Hito 2).
 *
 * Falla (exit 1) si encuentra, fuera de `src/styles/tokens.css`, un valor de
 * diseño escrito "a pelo":
 *   - colores: hex (`#fff`), o funcionales (`oklch()`, `oklab()`, `lch()`,
 *     `lab()`, `hsl()`, `hsla()`, `rgb()`, `rgba()`);
 *   - longitudes fijas: `12px`, `1.5rem`, `0.75em`, dentro de utilidades
 *     arbitrarias de Tailwind (`p-[13px]`, `text-[#fff]`) o de `style={{…}}`.
 *
 * Los porcentajes (`width: 50%`) y las referencias `var(--token)` y
 * `var(--spacing)` son relativos y están permitidos: no son decisiones fijas.
 *
 * El propio `tokens.css` queda excluido: es la única fuente de valores crudos.
 */
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import process from "node:process";

const SRC = resolve(process.cwd(), "src");
const EXCLUDED_FILES = new Set(["tokens.css"]);

type Violation = { file: string; line: number; reason: string };

// Colores crudos.
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const FUNC_COLOR = /\b(?:oklch|oklab|lch|lab|hsl|hsla|rgb|rgba)\s*\(/;
// Longitud fija.
const LENGTH = /\b\d+(?:\.\d+)?(?:px|rem|em)\b/;
// Utilidad arbitraria de Tailwind: `clase-[...]`.
const ARBITRARY = /\[[^\]]*\]/g;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else {
      const ext = extname(entry.name);
      if (ext === ".ts" || ext === ".tsx" || ext === ".css") {
        yield full;
      }
    }
  }
}

function findViolations(file: string, content: string): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const rel = relative(SRC, file);

    if (HEX_COLOR.test(line) || FUNC_COLOR.test(line)) {
      violations.push({
        file: rel,
        line: lineNumber,
        reason: "color crudo fuera de tokens.css",
      });
      return;
    }

    for (const match of line.matchAll(ARBITRARY)) {
      const inner = match[0].slice(1, -1);
      if (HEX_COLOR.test(inner) || FUNC_COLOR.test(inner) || LENGTH.test(inner)) {
        violations.push({
          file: rel,
          line: lineNumber,
          reason: `utilidad arbitraria con valor crudo: ${match[0]}`,
        });
      }
    }

    // `style={{…}}` con longitud fija o color (se permiten porcentajes).
    if (line.includes("style={{")) {
      if (LENGTH.test(line) || HEX_COLOR.test(line) || FUNC_COLOR.test(line)) {
        violations.push({
          file: rel,
          line: lineNumber,
          reason: "estilo en línea con valor crudo",
        });
      }
    }
  });

  return violations;
}

const all: Violation[] = [];
for (const file of walk(SRC)) {
  if (EXCLUDED_FILES.has(file.split("/").pop() ?? "")) continue;
  all.push(...findViolations(file, readFileSync(file, "utf8")));
}

if (all.length > 0) {
  console.error("Valores de diseño fuera de tokens.css:");
  for (const v of all) {
    console.error(`  ${v.file}:${v.line} — ${v.reason}`);
  }
  console.error(`\n${all.length} infracción(es). Corrige usando tokens.`);
  process.exit(1);
}

console.log("check-design-tokens: sin valores crudos fuera de tokens.css.");
