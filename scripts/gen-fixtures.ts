#!/usr/bin/env node
/**
 * Genera los fixtures de test (§8.5). Los fixtures son sintéticos y propios
 * (MIT), generados sin ffmpeg: las imágenes con canvas y los vídeos con
 * Mediabunny, ambos dentro de Chromium vía Playwright.
 *
 * Estado por hitos (sin humo):
 *   - Hito 0: crea la estructura `tests/fixtures/`, su `README.md` y
 *     `LICENSES.md`, y los fixtures que se pueden producir sin navegador
 *     (fichero vacío, SVG con <text>/<path>).
 *   - Hito 3: fixtures de imagen basados en canvas (degradados, tablero con
 *     alfa, carta de color, ruido, 4000×3000, JPEG con EXIF, PNG paleta, GIF
 *     animado, TIFF, BMP, JPEG truncado).
 *   - Hito 5: fixtures de vídeo con Mediabunny (WebM VP9+Opus, MP4 H.264+AAC,
 *     clip sin audio, clip sólo audio).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

const FIXTURES = resolve(process.cwd(), "tests", "fixtures");
const IMAGES = join(FIXTURES, "images");
const VIDEO = join(FIXTURES, "video");

const README = `# Fixtures de test

Todos los fixtures son **sintéticos y generados por nosotros** con
\`npm run fixtures:generate\`, por lo que su licencia es trivial: **MIT, nuestra**.

- Imágenes: degradados deterministas, patrón de tablero con canal alfa, carta de
  color, foto sintética con ruido, 4000×3000, JPEG con EXIF (GPS + orientación 6),
  PNG con paleta, GIF animado de 10 frames, TIFF, BMP, SVG, JPEG truncado,
  fichero de 0 bytes.
- Vídeo: generados con Mediabunny (WebM VP9+Opus, MP4 H.264+AAC, sin audio,
  sólo audio).

Cada fichero queda documentado en \`LICENSES.md\`. No se admite material externo
salvo dominio público o licencia libre verificada y anotada.
`;

const LICENSES = `# Licencias de los fixtures

Todo el material de esta carpeta es obra propia generada por
\`scripts/gen-fixtures.ts\` y se distribuye bajo **MIT** (© 2026, proyecto Tolva).

Si en el futuro se añade material externo, sólo se admite dominio público o
licencia libre verificada y anotada (p. ej. Big Buck Bunny, CC-BY 3.0, Blender
Foundation), con la atribución exacta en este fichero.
`;

// SVG con texto y trazado: sirve para verificar el rasterizado de SVG (§5.1).
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
  <rect width="320" height="180" fill="#123a5c"/>
  <circle cx="90" cy="90" r="48" fill="#e0b34a"/>
  <path d="M160 150 L240 30 L300 150 Z" fill="#2f8f6b"/>
  <text x="20" y="30" font-family="system-ui" font-size="24" fill="#ffffff">Tolva</text>
</svg>
`;

function run(): number {
  for (const dir of [FIXTURES, IMAGES, VIDEO]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  writeFileSync(join(FIXTURES, "README.md"), README);
  writeFileSync(join(FIXTURES, "LICENSES.md"), LICENSES);
  writeFileSync(join(IMAGES, "sample.svg"), SVG);
  // Fichero de 0 bytes: caso límite del §8.3.
  writeFileSync(join(IMAGES, "empty.bin"), Buffer.alloc(0));

  console.log(
    "✓ Estructura de fixtures y fixtures sin navegador generados.\n" +
      "  Los fixtures de imagen (canvas) llegan en el Hito 3 y los de vídeo (Mediabunny) en el Hito 5.",
  );
  return 0;
}

process.exit(run());
