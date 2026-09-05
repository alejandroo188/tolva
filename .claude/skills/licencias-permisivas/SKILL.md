---
name: licencias-permisivas
description: Verificar la licencia de una dependencia ANTES de instalarla en Tolva. Usar siempre que se vaya a añadir o actualizar cualquier paquete npm, y siempre que una dependencia nueva aparezca en el árbol. Detecta copyleft viral (GPL/AGPL/LGPL) incluso cuando el package.json miente, y mantiene THIRD_PARTY_NOTICES.md al día.
---

# Licencias permisivas — verificación previa a instalar

Tolva es MIT y no admite copyleft viral en el bundle. Esta skill es el procedimiento para
comprobar una dependencia **antes** de instalarla. No confiar en la declaración de `package.json`:
hay casos (p. ej. `heic2any`) en que dice MIT pero distribuye un WASM LGPL-3.0.

## Procedimiento

1. **Registro npm** — consulta la licencia declarada y la versión exacta:
   ```bash
   npm view <paquete>@<version> license
   ```
   Anota la versión. No uses `latest` de memoria.

2. **Repositorio de origen** — localiza el repo (campo `repository` de
   `npm view <paquete> repository.url`) y lee su fichero `LICENSE` real. La declaración de npm y
   el fichero del repo pueden no coincidir; manda el fichero del repo.

3. **Binarios subyacentes (crítico)** — si el paquete empaqueta WASM, nativo o binarios de otros
   proyectos, comprueba la licencia de **esos** artefactos, que `package.json` no declara:
   ```bash
   # listar los ficheros que se van a descargar e instalar
   npm pack <paquete>@<version> --dry-run
   ```
   Busca `*.wasm`, `*.node`, `*.a`, `*.so`, `*.dll`, y verifica su procedencia y licencia.

4. **Verifica contra la lista blanca** — la licencia efectiva debe estar en:
   MIT · Apache-2.0 · BSD-2-Clause · BSD-3-Clause · ISC · MPL-2.0 · 0BSD · CC0-1.0 · Unlicense ·
   BlueOak-1.0.0 · OFL-1.1 · CC-BY-4.0 · Zlib.
   **Prohibido** cualquier GPL, AGPL, LGPL, SSPL, BUSL o CC-BY-NC, y cualquier paquete sin
   licencia declarada.

5. **Regla especial MPL-2.0** — si es MPL-2.0, está permitido, pero queda prohibido **parchear
   forks** de esa dependencia. Si hace falta un arreglo, se envía aguas arriba o se rodea desde
   código propio (ver `docs/LEGAL_DECISIONS.md` §3).

6. **Después de instalar** — regenera los avisos y verifica el guardián:
   ```bash
   npm run notices:generate
   npm run licenses:check
   ```

## Casos resueltos de referencia

- `@ffmpeg/core` — declara GPL-2.0-or-later. **Rechazado.** Ver ADR-0003.
- `libheif-js` — LGPL-3.0. **Rechazado.** Ver ADR-0005.
- `heic2any` — `package.json` dice MIT, pero empaqueta libheif WASM → LGPL-3.0 efectivo.
  **Rechazado.** El ejemplo canónico de por qué el paso 3 es obligatorio.
- `caniuse-lite` (CC-BY-4.0) y `pako` (MIT AND Zlib) — admitidos; ver
  `docs/LEGAL_DECISIONS.md` §2.
- `sharp` / `@img/*` — `optionalDependencies` de Next, nunca importadas ni servidas; excluidas del
  guardián de forma acotada. Ver `docs/LEGAL_DECISIONS.md` §2.

## Si la licencia es dudosa o cambia

No instales. Escribe el hallazgo en `docs/LEGAL_DECISIONS.md` y abre la decisión al usuario
(es un bloqueo real, no una preferencia estética).
