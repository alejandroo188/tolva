# ADR-0010 — Aislamiento de origen (COOP/COEP) y CSP como refuerzo técnico de la privacidad

## Contexto

La privacidad se garantiza por capas. La capa estructural (`output: 'export'`) no basta sola: hay
que reforzarla en el navegador y permitir APIs avanzadas de WASM.

## Opciones

1. Sin cabeceras especiales.
2. CSP estricta + `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`.

## Decisión

**Opción 2.** Se activan desde el Hito 0, no al final.

## Consecuencias

- `connect-src 'self'` y `form-action 'none'`: aunque hubiera código de subida, el navegador lo
  bloquearía. Es la garantía impuesta por el navegador.
- `crossOriginIsolated === true` → `SharedArrayBuffer` → builds multihilo de WASM donde jSquash
  los publique.
- Coste: no podemos incrustar recursos de terceros — y no incrustamos ninguno.
- Un test E2E afirma `crossOriginIsolated` en el despliegue.
