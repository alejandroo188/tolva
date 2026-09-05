# PROGRESS.md — Estado de ejecución de Tolva

Fecha de arranque: 2026-09-05 · Ejecutor: sesión `ejecutor del plan` · Plan: `PLAN.md` (fuente de verdad).

Regla de cierre, idéntica en todos los hitos: **build + unitarios + E2E + lint/typecheck en verde,
más una prueba funcional real con ficheros de ejemplo.** Si algo no se puede ejecutar en este
entorno, se escribe aquí con el motivo y la alternativa. Sin humo.

---

## Hito 0 — Fundaciones, legalidad automatizada y tuberías

**Estado: EN CURSO** (documentación escrita; pendiente git/branches/CI/Vercel).

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
- **Exclusión acotada `sharp`/`@img/*`** del guardián: son `optionalDependencies` de Next que nunca
  se importan ni sirven. Documentado en `docs/LEGAL_DECISIONS.md` §2.
- **CC-BY-4.0 (`caniuse-lite`) y Zlib (`pako`)** añadidas a la lista blanca. Documentado en
  `docs/LEGAL_DECISIONS.md` §2.

### Entregables completados en este hito

- `LICENSE` (MIT), `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`.
- `docs/RESEARCH.md`, `docs/LEGAL_DECISIONS.md`, `docs/ARCHITECTURE.md` (completos).
- `docs/adr/0001`–`0014` (14 ADRs).
- `.claude/skills/licencias-permisivas/SKILL.md`.
- Los cinco scripts de `scripts/`, `vercel.json`, workflows de CI, husky/commitlint.

### Pendiente en este hito

- [ ] Commit inicial (Conventional Commits) y push de `main`.
- [ ] Crear `staging` desde `main` y push.
- [ ] Protección de rama en `main` y `staging`.
- [ ] Conectar el repo a Vercel: `main` → producción, `staging` → preview permanente.
- [ ] Desplegar `staging` y verificar cabeceras con `curl -I` (pegar salida aquí).
- [ ] Verificar `crossOriginIsolated === true` en staging.
- [ ] Probar que el push directo a `main` es **rechazado**.
- [ ] PR de prueba a `staging` con CI en verde.

---

## Hitos 1–10

Pendientes. Se irán rellenando al cerrar cada uno.
