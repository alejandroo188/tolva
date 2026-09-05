# ADR-0012 — GIF: gifuct-js + gifenc, sin depender de `ImageDecoder`

## Contexto

El GIF animado necesita descomponerse en frames (para editar y convertir) y codificarse (para
exportar). `ImageDecoder` lo haría pero sólo existe en Chromium.

## Opciones

1. `ImageDecoder` (sólo Chromium).
2. gifuct-js (descomposición) + gifenc (codificación con cuantización).

## Decisión

**Opción 2.**

## Consecuencias

- gifuct-js (MIT) descompone GIF animado sin depender de `ImageDecoder`, que no es cross-browser.
- gifenc (MIT) codifica GIF con cuantización.
- Funciona igual en los cinco proyectos de Playwright, no sólo en Chromium.
