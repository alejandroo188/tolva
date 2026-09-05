# ADR-0016 — jSquash single-threaded ante el worker anidado que cuelga Turbopack

## Contexto

Los códecs Emscripten de jSquash (`@jsquash/avif`, `@jsquash/jxl`) empaquetan, además de la
variante single-threaded, una variante **multi-threaded** (`avif_enc_mt.js`, `jxl_enc_mt*.js`) que
engendra un worker anidado con `new Worker(new URL("*.worker.mjs", import.meta.url), {type:"module"})`
y ese worker, a su vez, hace `import("./avif_enc_mt.js")` sobre su propio módulo.

Con `next build` en Next 16 (Turbopack), incluir esas variantes cuelga la fase de compilación:
el proceso queda en *Creating an optimized production build ...* de forma indefinida (deadlock en
los trabajadores de Turbopack, confirmado con `sample`). La variante single-threaded (`avif_enc.js`,
`jxl_enc.js`, `webp_enc*.js`) compila sin problema, incluido su `new URL("*.wasm", import.meta.url)`
y su `var _scriptDir = import.meta.url`.

## Opciones

1. Parchear el glue para sustituir `new URL(..., import.meta.url)` por rutas estáticas.
2. Quitar las variantes multi-threaded de los `encode.js` de jSquash vía `patch-package`.
3. Cargar jSquash fuera del bundle desde `public/` (evitar que Turbopack lo vea).

## Decisión

**Opción 2.**

## Consecuencias

- Parche mínimo y legible en `patches/@jsquash+avif+2.1.1.patch` y
  `patches/@jsquash+jxl+1.3.0.patch`: se elimina la rama `if (threads()) { import('..._mt.js') }`
  y se fuerza la variante single-threaded. Se aplica en `postinstall` con `patch-package`.
- **No se pierde nada en el despliegue actual**: sin cabeceras COOP/COEP (aislamiento de origen,
  ADR-0010), `SharedArrayBuffer` no está disponible y `threads()` de `wasm-feature-detect` devuelve
  `false`; la rama multi-threaded nunca se habría ejecutado. Es la misma razón por la que el pool de
  workers (§8.2) es nuestro mecanismo de paralelismo, no los hilos WASM.
- Si en el futuro se añade aislamiento de origen con COOP/COEP (para habilitar hilos WASM), habrá que
  revisar estos parches: la variante `_mt` aportaría velocidad a coste de un worker anidado que
  Turbopack sigue sin empaquetar, y habría que reconsiderar la opción 3.
- `webp` conserva su variante **SIMD** (`webp_enc_simd.js`): es WebAssembly SIMD, no hilos, no genera
  worker y compila sin problema.
