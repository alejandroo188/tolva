# ADR-0011 — TIFF vía UTIF2; codificador BMP propio sin dependencia

## Contexto

Ningún navegador lee TIFF salvo Safari, y ninguno codifica BMP de forma útil. Ambos formatos están
en el alcance de imagen.

## Opciones

1. Dependencia para TIFF y dependencia para BMP.
2. UTIF2 (MIT) para leer TIFF; codificador BMP propio (~60 líneas, BITMAPINFOHEADER 24/32 bits).

## Decisión

**Opción 2.**

## Consecuencias

- UTIF2 (MIT) cubre la lectura de TIFF donde `createImageBitmap` no llega.
- La lectura de BMP la da `createImageBitmap` de forma nativa; sólo falta escribir, que es trivial
  y no justifica una dependencia.
- Menos superficie de dependencias y licencias.
