# ADR-0014 — Sin analítica ni cookies: por tanto, sin banner

## Contexto

Una web suele llevar analítica, y con ella un banner de cookies. Eso entra en tensión directa con
la promesa de privacidad de Tolva.

## Opciones

1. Analítica (aunque sea anónima) + banner de consentimiento.
2. Cero analítica, cero cookies de seguimiento.

## Decisión

**Opción 2.**

## Consecuencias

- No hay nada que rastrear ni por lo que pedir consentimiento: **no hay banner**.
- La política de cookies declara que no se usan cookies ni analítica y explica por qué.
- Es coherente con `connect-src 'self'`: ninguna petición a un dominio de terceros.
- Renunciamos a métricas de uso a cambio de una privacidad sin asteriscos.
