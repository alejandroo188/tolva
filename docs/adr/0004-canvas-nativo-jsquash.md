# ADR-0004 — Canvas nativo + jSquash para imagen

## Contexto

La imagen necesita decodificar formatos que el navegador no lee (AVIF en algunos, JXL en casi
ninguno, TIFF salvo Safari), operar píxeles (recorte, redimensionado, ajustes) y codificar con
control fino.

## Opciones

1. Canvas nativo (`createImageBitmap`/`toBlob`) solo.
2. Canvas nativo + jSquash (códecs WASM derivados de Squoosh, Apache-2.0).

## Decisión

**Opción 2.**

## Consecuencias

- Canvas nativo cubre la decodificación que el navegador ya sabe hacer y la rasterización de SVG.
- jSquash aporta codificación/decodificación AVIF, JPEG XL, WebP, MozJPEG, PNG y oxipng, más el
  remuestreo Lanczos de `@jsquash/resize` que pide el brief.
- Los códecs WASM se cargan de forma perezosa (nada de `.wasm` en la carga inicial).
- jSquash es Apache-2.0 (con componentes BSD-2/3-Clause), atribuido en `THIRD_PARTY_NOTICES.md`.
