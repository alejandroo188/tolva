# ADR-0008 — Iconografía: Lucide (ISC); se rechazan SF Symbols

## Contexto

La interfaz necesita un conjunto de iconos coherente. SF Symbols es el conjunto de Apple.

## Opciones

1. SF Symbols.
2. Lucide (librería de iconos ISC, consistente con el estilo de línea).

## Decisión

**Opción 2.**

## Consecuencias

- SF Symbols está licenciado para interfaces de apps en plataformas Apple; no se puede servir desde
  una web. Queda rechazado.
- Lucide es ISC (permissivo) y `lucide-react` se integra de forma directa con React.
- Un solo lenguaje de línea para toda la interfaz.
