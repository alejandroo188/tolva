#!/usr/bin/env node
/**
 * Copia los binarios WASM de jSquash de `node_modules/` a `public/codecs/`
 * para que se sirvan como assets estáticos del propio origen.
 *
 * Por qué copiar y no dejar que el bundler los emita: los códecs Emscripten de
 * jSquash resuelven el `.wasm` en tiempo de ejecución vía `locateFile` (y los
 * wasm-bindgen vía `init(ruta)`), no como un `import` estático. Servirlos desde
 * `/codecs/<códec>/<fichero>` nos da una URL estable y el control total de la
 * carga diferida (cero `.wasm` hasta que se pide el formato, §8.6).
 *
 * Se ejecuta en `predev`, `prebuild` y `postinstall`. Los ficheros resultantes
 * quedan en `public/codecs/`, ignorados por git (se regeneran desde
 * `node_modules`, reproducible vía `npm ci`).
 */
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

/** `package` → `[ruta dentro del paquete, nombre en /codecs/<id>/]`. */
const ASSETS: Record<string, [string, string][]> = {
  "@jsquash/avif": [
    ["codec/enc/avif_enc.wasm", "avif_enc.wasm"],
    ["codec/dec/avif_dec.wasm", "avif_dec.wasm"],
  ],
  "@jsquash/jxl": [
    ["codec/enc/jxl_enc.wasm", "jxl_enc.wasm"],
    ["codec/dec/jxl_dec.wasm", "jxl_dec.wasm"],
  ],
  "@jsquash/webp": [
    ["codec/enc/webp_enc.wasm", "webp_enc.wasm"],
    ["codec/enc/webp_enc_simd.wasm", "webp_enc_simd.wasm"],
  ],
  "@jsquash/resize": [
    ["lib/resize/pkg/squoosh_resize_bg.wasm", "squoosh_resize_bg.wasm"],
    ["lib/hqx/pkg/squooshhqx_bg.wasm", "squooshhqx_bg.wasm"],
    ["lib/magic-kernel/pkg/jsquash_magic_kernel_bg.wasm", "jsquash_magic_kernel_bg.wasm"],
  ],
};

/** id del códec (subdirectorio en /codecs) derivado del nombre del paquete. */
function codecId(pkg: string): string {
  return pkg.split("/").pop() ?? pkg;
}

function run(): number {
  const root = resolve(process.cwd());
  const publicCodecs = join(root, "public", "codecs");
  let copied = 0;

  for (const [pkg, files] of Object.entries(ASSETS)) {
    const id = codecId(pkg);
    const destDir = join(publicCodecs, id);
    mkdirSync(destDir, { recursive: true });

    for (const [srcRel, name] of files) {
      const src = join(root, "node_modules", pkg, srcRel);
      if (!existsSync(src)) {
        console.error(`✗ Falta ${pkg}/${srcRel}. Ejecuta \`npm ci\` primero.`);
        return 1;
      }
      copyFileSync(src, join(destDir, name));
      copied += 1;
    }
  }

  console.log(`✓ ${copied} binarios WASM copiados a public/codecs/.`);
  return 0;
}

process.exit(run());
