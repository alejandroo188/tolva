# ADR-0013 — PDF fuera del alcance de la v1

## Contexto

PDF (imágenes→PDF y PDF→imágenes) es una función natural para una herramienta de conversión, pero
añade una dimensión de complejidad que no aporta al núcleo (imagen + vídeo).

## Opciones

1. Incluir PDF en la v1.
2. Dejarlo fuera de la v1, con la arquitectura preparada para añadirlo en v1.1.

## Decisión

**Opción 2.** Decisión cerrada por el usuario; no se reabre.

## Consecuencias

- El modelo de receta y el patrón de workers quedan diseñados para poder añadir una operación
  «pdf» sin cambios estructurales.
- v1 se concentra en hacer imagen y vídeo excepcionalmente bien.
- Documentado como pendiente para v1.1 en `PROGRESS.md`.
