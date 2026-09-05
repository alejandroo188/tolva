# ADR-0005 — HEIC: sólo decodificación nativa del sistema; se rechaza libheif

## Contexto

HEIC/HEIF sólo se puede decodificar de forma fiable en dispositivos Apple (Safari 17+, macOS
Sonoma+, iOS 17+), vía el códec del sistema accesible desde `createImageBitmap`. Fuera de Apple no
hay decodificador, y traerlo por software tiene dos costes.

## Opciones

1. Depender de libheif compilado a WASM para leer HEIC en cualquier navegador.
2. Usar sólo la decodificación nativa del sistema, con un mensaje claro donde no exista.

## Decisión

**Opción 2.**

## Consecuencias

- libheif es **LGPL-3.0** y además arrastra las patentes de HEVC: doble motivo para rechazarlo.
- HEIC se lee donde el sistema operativo lo permite; en el resto de navegadores se muestra un
  mensaje concreto (p. ej. «convierte en el propio iPhone»).
- Evitamos por completo las patentes de HEVC en el software que distribuimos.
