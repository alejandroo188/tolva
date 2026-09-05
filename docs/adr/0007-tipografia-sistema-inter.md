# ADR-0007 — Tipografía: stack de sistema + Inter (OFL); se rechazan las fuentes de Apple

## Contexto

El brief pide una única familia tipográfica. Las fuentes de Apple (SF Pro, SF Mono, New York) son
atractivas en pantallas Apple pero tienen una restricción de licencia.

## Opciones

1. Servir SF Pro / SF Mono / New York como webfonts.
2. Stack de sistema (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, …) con Inter variable
   autoalojada (OFL-1.1) como fallback.

## Decisión

**Opción 2.** Una sola familia; nada de monoespaciada para etiquetas de datos.

## Consecuencias

- Las fuentes de Apple están licenciadas para interfaces de apps en plataformas Apple y **no se
  pueden servir desde una web**. Quedan descartadas.
- El stack de sistema renderiza SF de forma nativa y legítima en dispositivos Apple.
- Inter (OFL-1.1) se autoaloja con subconjunto latino (≤ 60 KB) para el resto.
- La personalidad visual la da el *tratamiento* de la cifra (escala, peso, tracking), no una
  segunda tipografía.
