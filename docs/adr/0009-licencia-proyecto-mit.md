# ADR-0009 — Licencia del proyecto: MIT

## Contexto

Tolva es una herramienta que queremos que cualquiera pueda desplegar, forkear y adaptar.

## Opciones

1. MIT.
2. GPL (copyleft fuerte).
3. Apache-2.0.

## Decisión

**Opción 1.** MIT.

## Consecuencias

- Máxima permissividad: uso comercial, modificación y redistribución sin publicar cambios.
- Coherente con la mayor parte del stack (Next, React, Tailwind).
- Impone la obligación inversa en las dependencias: nada de copyleft viral en el bundle. De ahí la
  lista negra GPL/AGPL/LGPL/SSPL/BUSL y el guardián de licencias en CI.
- Decisión cerrada por el usuario; no se reabre.
