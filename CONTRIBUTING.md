# Guía de contribución

Gracias por querer contribuir a Tolva. Estas reglas existen por dos motivos:
mantener la promesa de privacidad (100 % en cliente) y mantener la pila de
licencias limpia (nada de copyleft viral).

## Antes de añadir una dependencia

Toda dependencia nueva pasa **obligatoriamente** por la skill
`.claude/skills/licencias-permisivas/`, que documenta el procedimiento de
verificación *antes* de instalar:

1. Consultar la licencia declarada en el registro de npm (`npm view <pkg> license`).
2. Comprobar el fichero `LICENSE` del repositorio de origen.
3. Comprobar las licencias de los binarios WASM/nativos subyacentes que el
   `package.json` no declara (el caso de `heic2any` es el ejemplo canónico de
   por qué esto importa).
4. Actualizar `THIRD_PARTY_NOTICES.md` (`npm run notices:generate`).

`npm run licenses:check` falla en CI ante cualquier licencia GPL, AGPL, LGPL,
SSPL, BUSL o CC-BY-NC, y ante paquetes sin licencia declarada.

## Reglas de licencia

- Licencia del proyecto: **MIT**.
- **MPL-2.0** (mediabunny, exifreader, axe-core) es copyleft *por fichero*, no
  viral. Obligaciones que asumimos: conservar los avisos, enlazar al código
  fuente en `/licencias`, y **no parchear forks de dependencias MPL**. Si hace
  falta un arreglo, se envía aguas arriba o se rodea desde código propio.
- **No distribuimos códecs H.264/HEVC**: la codificación la hace el navegador o
  el sistema del usuario. La pila libre de regalías es AV1 + VP9 + Opus + WebM.

## Flujo de trabajo

- Ramas permanentes: `main` (producción) y `staging` (integración).
- `feat/*` · `fix/*` · `docs/*` · `chore/*` → PR a `staging` → validación en el
  despliegue de staging → PR de `staging` a `main`.
- Conventional Commits, forzado por commitlint en `commit-msg`.
- Historial lineal; `main` y `staging` protegidas (sin push directo).
- **Estrategia de merge:** `feat/*`·`fix/*`·`docs/*`·`chore/*` → `staging` con **squash**
  (aplana el trabajo de la rama); `staging` → `main` con **rebase**. GitHub reescribe el commit
  en ambos casos (squash *y* rebase), así que la regla que de verdad mantiene `main` y `staging`
  sincronizadas es ésta: **después de cada merge de `staging`→`main`, `staging` debe apuntar al
  mismo SHA que `main`**. Si el rebase de GitHub ha reescrito el commit y las ramas han divergido,
  se fuerza el reset de `staging` a `main` (desactivando y reactivando la protección de `staging`
  vía API, y restaurándola idéntica). Lo que hay que evitar es tocar `staging` a mano (rebase
  local + force-push): fue exactamente eso lo que creó la divergencia, no el squash en sí.

## Cerrar un hito

Un hito no se da por terminado sin: build, unitarios, E2E, lint y typecheck en
verde, **más** una prueba funcional real con ficheros de ejemplo. Si un test no
se puede ejecutar en este entorno, se documenta en `PROGRESS.md` con el motivo y
la alternativa. Nada de marcar como hecho lo que no se ha visto pasar.

## Material de pruebas

Los fixtures de `tests/fixtures/` son sintéticos y propios (MIT). No se admite
material externo con derechos; sólo dominio público o licencia libre verificada
y anotada en `tests/fixtures/LICENSES.md`.
