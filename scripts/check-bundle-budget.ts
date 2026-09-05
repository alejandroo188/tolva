#!/usr/bin/env node
/**
 * Comprueba los presupuestos de bundle del §8.6 sobre el build estático `out/`.
 *
 * Se ejecuta tras `next build`. A partir del Hito 7 se activa en CI como puerta
 * de rendimiento; antes sólo se invoca manualmente.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import process from "node:process";

const OUT = resolve(process.cwd(), "out");

interface Budget {
  name: string;
  /** límite en bytes gzip (suma) */
  limit: number;
  /** extensión(es) a contabilizar */
  ext: string[];
}

// Umbrales del §8.6. Valores en KB -> bytes.
const KB = 1024;
const BUDGETS: Budget[] = [
  { name: "JS total", limit: 130 * KB, ext: [".js"] },
  { name: "CSS total", limit: 25 * KB, ext: [".css"] },
  { name: "Fuentes", limit: 60 * KB, ext: [".woff2", ".woff"] },
];

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

  const files = walk(OUT);
  const failures: string[] = [];

  for (const budget of BUDGETS) {
    const matched = files.filter((f) => budget.ext.some((e) => f.endsWith(e)));
    const totalGzip = matched.reduce((sum, f) => sum + gzipSync(readFileSync(f)).length, 0);
    if (totalGzip > budget.limit) {
      failures.push(
        `${budget.name}: ${(totalGzip / KB).toFixed(1)} KB gzip (límite ${budget.limit / KB} KB)`,
      );
    } else {
      console.log(
        `✓ ${budget.name}: ${(totalGzip / KB).toFixed(1)} KB gzip ≤ ${budget.limit / KB} KB`,
      );
    }
  }

  // Los .wasm de `out/codecs/` se sirven como assets estáticos y se cargan de
  // forma diferida (sólo cuando se pide su formato). El presupuesto de carga
  // inicial exige 0 bytes de .wasm *en el bundle*, no en la carpeta de códecs
  // perezosos (§8.6; el E2E nº 9 lo verifica en runtime).
  const codecDir = join(OUT, "codecs");
  const wasm = files.filter((f) => f.endsWith(".wasm") && !f.startsWith(codecDir + "/"));
  if (wasm.length > 0) {
    failures.push(
      `WASM en el bundle estático (${wasm.length} ficheros fuera de out/codecs/). El presupuesto de carga inicial exige 0 bytes de .wasm.`,
    );
  } else {
    console.log("✓ Sin ficheros .wasm en el bundle (los códecs perezosos quedan en out/codecs/).");
  }

  if (failures.length > 0) {
    console.error("✗ Presupuestos de bundle superados:");
    for (const f of failures) console.error(`  - ${f}`);
    return 1;
  }
  console.log("✓ Presupuestos de bundle cumplidos.");
  return 0;
}

process.exit(run());
