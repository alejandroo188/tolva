# Changelog

Todas las modificaciones notables de este proyecto se documentan en este fichero.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
y el proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

## [0.1.0] — 2026-09-05

### Hito 0 — Fundaciones, legalidad automatizada y tuberías

- Repositorio público `alejandroo188/tolva` con `main` y `staging` protegidas.
- Andamiaje Next.js 16 + TypeScript (strict) + Tailwind CSS v4 + ESLint/Prettier.
- husky/lint-staged + commitlint (Conventional Commits).
- Vitest y Playwright configurados (5 proyectos de navegador).
- Los cinco scripts de `scripts/`: guardián de licencias, generador de avisos de
  terceros, fixtures, service worker y presupuesto de bundle.
- Guardián de licencias con prueba negativa real (GPL detectada y bloqueada).
- `THIRD_PARTY_NOTICES.md` generado automáticamente y verificado en CI.
- Workflows de CI (`calidad`, `e2e`, `lighthouse`).
- Documentación: `docs/RESEARCH.md`, `docs/LEGAL_DECISIONS.md`,
  `docs/ARCHITECTURE.md` y ADRs 0001–0014.
- Proyecto de Vercel conectado con despliegue de `staging` verificado.
