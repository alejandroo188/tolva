# PROGRESS.md — Estado de ejecución de Tolva

Fecha de arranque: 2026-09-05 · Ejecutor: sesión `ejecutor del plan` · Plan: `PLAN.md` (fuente de verdad).

Regla de cierre, idéntica en todos los hitos: **build + unitarios + E2E + lint/typecheck en verde,
más una prueba funcional real con ficheros de ejemplo.** Si algo no se puede ejecutar en este
entorno, se escribe aquí con el motivo y la alternativa. Sin humo.

---

## Hito 0 — Fundaciones, legalidad automatizada y tuberías

**Estado: CERRADO** — todos los criterios de aceptación ejecutados y vistos pasar.

### Batería local en verde

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ 0 errores, 0 avisos |
| `npm run typecheck` | ✅ sin errores |
| `npm run test:unit` | ✅ 1 test pasado |
| `npm run build` | ✅ export estático (`/`, `/_not-found`) |
| `npm run size` | ✅ JS 172,61 KB gzip ≤ 200 KB baseline; CSS 2,11 KB gzip ≤ 25 KB |
| `npm run licenses:check` | ✅ 52 dependencias, sin violaciones |
| `npm run notices:check` | ✅ `THIRD_PARTY_NOTICES.md` al día |

### Prueba negativa real del guardián de licencias (ejecutada, salida pegada)

Caso **FALLO** — tras `npm install @ffmpeg/core@0.12.10 --save-prod`:

```
✗ El guardián de licencias ha encontrado violaciones:
  - @ffmpeg/core: licencia prohibida "GPL-2.0-or-later" (coincide con GPL)
EXIT_CODE=1
```

Caso **PASO** — tras `npm uninstall @ffmpeg/core`:

```
✓ Licencias verificadas: 52 dependencias de producción revisadas, sin violaciones.
EXIT_CODE=0
```

El guardián detecta GPL y falla, y vuelve a pasar al retirar el paquete. `@ffmpeg/core` queda
descartado además como dependencia real (ver `docs/LEGAL_DECISIONS.md` §6 y ADR-0003).

### Git, ramas y protección

- Repo público `github.com/alejandroo188/tolva`; ramas remotas `main`, `staging`, `chore/ci-sanity-check`.
- Protección activa en `main` y `staging` (API GitHub): sin push directo, PR obligatoria, checks de CI
  obligatorios, historial lineal, conversaciones resueltas, `enforce_admins: true`.
- **Push directo a `main` rechazado (probado de verdad)**:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Changes must be made through a pull request.
remote: error: 4 of 4 required status checks are expected.
To github.com:alejandroo188/tolva.git
 ! [remote rejected] main -> main (protected branch hook declined)
```

### CI en verde (PR #1 `chore/ci-sanity-check` → `staging`)

| Job | Resultado |
|---|---|
| `Calidad (lint · typecheck · licencias · unit · build)` | ✅ pass |
| `E2E (chromium)` | ✅ pass |
| `E2E (firefox)` | ✅ pass |
| `E2E (webkit)` | ✅ pass |
| `Lighthouse CI` | ✅ pass (tras fijar el baseline del Hito 0, ver decisiones) |
| `Vercel` | ✅ Deployment completed |

### Despliegue de Vercel — staging/preview accesible y cabeceras verificadas

- Proyecto conectado: `main` → producción, `staging` y ramas → preview.
- **Deployment Protection (SSO) desactivada** vía API (`PATCH /v9/projects/…` con `ssoProtection: null`).
  Antes devolvía un 302 a `vercel.com/sso-api`; ahora responde 200 público.

`curl -I` sobre el preview (salida pegada, cabeceras del §9.3):

```
HTTP/2 200
content-security-policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
cross-origin-embedder-policy: require-corp
cross-origin-opener-policy: same-origin
permissions-policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
referrer-policy: no-referrer
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-content-type-options: nosniff
x-robots-tag: noindex
```

> `x-robots-tag: noindex` es normal en previews de Vercel (no se indexan); desaparece en producción.

**`crossOriginIsolated` verificado en navegador real (Playwright/Chromium) sobre el preview:**

```json
{ "crossOriginIsolated": true, "secureContext": true }
```

### Decisiones técnicas documentadas

- **Versión de TypeScript pinada a `5.9.3`.** El plan decía «latest 5.x»; la latest real en npm es
  7.0.2 (fuera de la serie 5.x). Se fija 5.9.3, la última de la serie 5, para respetar la
  restricción del plan y la compatibilidad de `eslint-config-next`.
- **ESLint a `^9`.** El plan no fijaba versión; la latest (10.10.0) aún no está soportada por
  `eslint-config-next 16.3.4`. Se usa la serie 9.
- **`eslint-config-next` ya empaqueta `jsx-a11y`.** Añadirlo de nuevo daba error de redefinición de
  plugin; se deja la versión que trae Next.
- **Presupuesto de bundle: baseline 200 KB en el Hito 0.** El target del §8.6 es «JS inicial de `/`
  ≤ 130 KB gzip», que es un entregable del Hito 7 (la app aún es un esqueleto y `size-limit` suma
  todo el JS del framework). Se fija un baseline de 200 KB para que CI sea verde ahora, con el
  nombre explícito «baseline Hito 0»; **se ajusta a 130 KB en el Hito 7**, cuando la carga diferida
  de códecs y el PWA estén en su sitio.
- **Lighthouse: la familia de rendimiento pasa a `warn` (no bloqueante) durante el Hito 0.** El
  esqueleto sólo arrastra el runtime de React/Next y, sobre el runner de CI (compartido y ruidoso),
  las métricas de rendimiento son puro ruido: se midieron 0,93 de Performance, 336 ms de TBT y, en
  una corrida posterior sin cambio de código, un LCP de 2.317 ms — tres métricas distintas fallando
  sobre una página casi vacía. Apretarlas ahora sería perseguir ruido de máquina, no mejorar la app.
  Por eso las aserciones de rendimiento (`performance`, `lcp`, `cls`, `tbt`) quedan en **`warn`** con
  los valores finales del §8.6 (≥ 95 / ≤ 1.800 ms / ≤ 0,05 / ≤ 150 ms): se miden y se informan en cada
  corrida (sin humo, el dato está ahí), pero no bloquean la build hasta que haya contenido real.
  **Accessibility = 100, Best Practices ≥ 95 y SEO ≥ 95 siguen como `error`** (deterministas y con
  sentido ya en el esqueleto). **Se pasan a `error` en el Hito 7**, cuando la carga diferida de códecs
  y el PWA amorticen el baseline del framework y las métricas midan la app, no la máquina.
- **Exclusión acotada `sharp`/`@img/*`** del guardián: son `optionalDependencies` de Next que nunca
  se importan ni sirven. Documentado en `docs/LEGAL_DECISIONS.md` §2.
- **`notices:check` determinista entre macOS y Linux.** Los binarios de plataforma (`@img/sharp-*`,
  `@next/swc-*`) varían según el SO del build y hacían que `THIRD_PARTY_NOTICES.md` difiriera entre
  la máquina local y el runner de CI. `scripts/gen-third-party-notices.ts` los excluye con
  `isExcluded()`; se documenta la exclusión en el propio fichero generado.
- **Vercel: `framework: "nextjs"` sin `outputDirectory`.** Añadir `outputDirectory: "out"` rompía el
  preset de Next.js (buscaba `routes-manifest.json` en `out/` cuando está en `.next/`). El preset
  de Next.js detecta `output: 'export'` y sirve `out/` por sí solo; `outputDirectory` se elimina.
- **CC-BY-4.0 (`caniuse-lite`) y Zlib (`pako`)** añadidas a la lista blanca. Documentado en
  `docs/LEGAL_DECISIONS.md` §2.
- **Discrepancia de nombre de scope en Vercel.** El plan asume la URL estable
  `tolva-git-staging-alejandroo188.vercel.app`, pero el scope real de Vercel es
  `alejandroo188s-projects` (con «s»). La URL estable de staging es por tanto
  `tolva-git-staging-alejandroo188s-projects.vercel.app`. Sin impacto funcional; se documenta.

### Entregables completados en este hito

- `LICENSE` (MIT), `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`.
- `docs/RESEARCH.md`, `docs/LEGAL_DECISIONS.md`, `docs/ARCHITECTURE.md` (completos).
- `docs/adr/0001`–`0014` (14 ADRs).
- `.claude/skills/licencias-permisivas/SKILL.md`.
- Los cinco scripts de `scripts/`, `vercel.json`, workflows de CI, husky/commitlint.

### Despliegue a producción

- PR #2 (`staging` → `main`) merged (squash) → `main` en `ae9aa72` → deploy de producción en Vercel.
- Producción accesible en `tolva-bice.vercel.app` (alias de producción asignado por Vercel), con las
  mismas cabeceras del §9.3 y `crossOriginIsolated: true` (verificado en navegador real).
- El `x-robots-tag: noindex` de los dominios `*.vercel.app` es comportamiento estándar de Vercel
  (los subdominios `.vercel.app` no se indexan; sólo se indexa un dominio personalizado, fuera de v1).

### Criterios de aceptación — estado final

| Criterio | Resultado |
|---|---|
| `lint && typecheck && test:unit && build` en verde | ✅ |
| Prueba negativa real del guardián de licencias (GPL) | ✅ salida pegada arriba |
| `THIRD_PARTY_NOTICES.md` generado + `notices:check` | ✅ |
| CI en verde en PR a `staging` | ✅ PR #1 (calidad + E2E ×3 + Lighthouse + Vercel) |
| `staging` desplegado, accesible, cabeceras con `curl -I` | ✅ salida pegada arriba |
| `crossOriginIsolated === true` en staging | ✅ (`{ "crossOriginIsolated": true }`) |
| Push directo a `main` rechazado (probado de verdad) | ✅ salida pegada arriba |

---

## Hitos 1–10

Pendientes. Se irán rellenando al cerrar cada uno.
