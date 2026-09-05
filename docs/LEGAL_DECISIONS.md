# Decisiones legales y de licencias

Toda decisión que afecta a la licencia del proyecto, a la de sus dependencias o a la distribución
de códecs está aquí, con su motivo. No se decide nada de esto de memoria: cada licencia se verifica
contra el registro de npm y, cuando hay binarios WASM/nativos, contra el repositorio de origen.

---

## 1. Licencia del proyecto: MIT

**Decisión:** el código de Tolva se publica bajo MIT (ver `LICENSE`).

**Motivo:** máxima permissividad para una herramienta que queremos que cualquiera pueda desplegar,
forkear y adaptar. MIT no impone copyleft ni obligación de publicar modificaciones. Es la misma
licencia que usa la mayor parte del stack (Next, React, Tailwind).

Ver ADR-0009.

## 2. La regla de licencias y su guardián

- **Lista blanca:** MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, 0BSD, CC0-1.0,
  Unlicense, BlueOak-1.0.0, OFL-1.1, CC-BY-4.0, Zlib.
- **Lista negra:** cualquier licencia que contenga GPL, AGPL, LGPL, SSPL, BUSL o CC-BY-NC, y
  cualquier paquete **sin licencia declarada**.
- El guardián es `scripts/check-licenses.ts`, ejecutado por `npm run licenses:check`, que **falla
  la build en CI** ante cualquier violación.

### Prueba negativa real (ejecutada, no supuesta)

Para demostrar que el guardián no es decorativo, se instaló temporalmente un paquete GPL y se
verificó que lo detecta:

```
$ npm install @ffmpeg/core@0.12.10 --save-prod
$ npm run licenses:check
✗ El guardián de licencias ha encontrado violaciones:
  - @ffmpeg/core: licencia prohibida "GPL-2.0-or-later" (coincide con GPL)
EXIT_CODE=1

$ npm uninstall @ffmpeg/core
$ npm run licenses:check
✓ Licencias verificadas: 52 dependencias de producción revisadas, sin violaciones.
EXIT_CODE=0
```

`@ffmpeg/core` se descartó además como dependencia real por el mismo motivo: ver §6.

### Extensiones de la lista blanca (documentadas)

Dos licencias se añadieron a la lista blanca tras aparecer en el árbol de producción, ambas
compatibles con una distribución MIT y verificadas:

- **CC-BY-4.0** — `caniuse-lite` (dependencia transitiva de los browserslist de Next). Atribución
  ya satisfecha por `THIRD_PARTY_NOTICES.md`. No es copyleft; sólo exige atribución.
- **Zlib** — `pako` (declarada como `(MIT AND Zlib)`). La licencia Zlib es permissiva y equivalente
  en la práctica a MIT/BSD.

### Exclusión acotada: sharp y `@img/*`

`next` declara `sharp` como dependencia opcional para su optimizador de imágenes en servidor, que
Tolva **desactiva** (`images: { unoptimized: true }`). Su árbol incluye
`@img/sharp-libvips-darwin-arm64`, licenciado **LGPL-3.0-or-later**.

**Decisión:** el guardián excluye `sharp` y los paquetes `@img/*` del análisis, y los lista de
forma transparente en `THIRD_PARTY_NOTICES.md`. Motivos:

1. Son `optionalDependencies` que no se instalan en la plataforma de build/despliegue salvo que el
   gestor las resuelva, y **nunca** se importan, empaquetan ni sirven en la aplicación.
2. No hay ruta de código que los cargue: con `output: 'export'` no se ejecuta ningún optimizador de
   imágenes en servidor.

Si en el futuro se usara `sharp` para generar assets en build (no en producción), se revisaría esta
decisión con un ADR propio. La exclusión se revisa en cada `licenses:check`.

## 3. MPL-2.0 (mediabunny, exifreader, axe-core)

MPL-2.0 es *copyleft por fichero*, no viral hacia la obra mayor. Su cláusula 3.3 permite
expresamente distribuir la obra mayor bajo otros términos. Obligaciones reales que asumimos:

1. Conservar los avisos de copyright y licencia (los mantiene el bundler; se refuerza con
   `THIRD_PARTY_NOTICES.md` y la página `/licencias`).
2. Enlazar desde `/licencias` al código fuente de cada dependencia MPL.
3. **Si en algún momento parcheamos un fichero de mediabunny, ese fichero sigue siendo MPL y hay
   que publicar la modificación.** Regla de proyecto: **no se parchean forks de dependencias MPL.**
   Si hace falta un arreglo, se envía aguas arriba o se rodea desde código propio.

## 4. Patentes de códecs — posición del proyecto

H.264 y HEVC tienen obligaciones de patente **independientes de la licencia del software**.

- **No distribuimos ningún códec H.264/HEVC.** Cuando el usuario exporta MP4/H.264, quien codifica
  es el navegador o el sistema operativo del usuario, con las licencias que ya tiene cubiertas.
  Nosotros sólo pedimos `VideoEncoder.configure({codec:'avc1...'})`.
- **La pila libre de regalías es AV1 + VP9 + Opus + WebM.** La UI **siempre** ofrece una salida
  libre junto a la de compatibilidad, y el preset por defecto de «Web ligero» usa VP9/Opus en WebM.
- Se documenta también en la página `/licencias`.

## 5. Fuentes de Apple — rechazadas

SF Pro, SF Mono, New York y SF Symbols están licenciadas para interfaces de apps en plataformas
Apple; **no se pueden servir desde una web**. La tipografía usa el stack de sistema (que en Apple
renderiza SF de forma nativa y legítima) con Inter (OFL-1.1) autoalojada como fallback; la
iconografía es Lucide (ISC). Ver ADR-0007 y ADR-0008.

## 6. Dependencias rechazadas, con motivo escrito

| Rechazado | Motivo |
|---|---|
| **`@ffmpeg/core` / ffmpeg.wasm** | El paquete publicado declara **`GPL-2.0-or-later`** en npm (verificado en 0.12.10). El build habitual usa `--enable-gpl` y `--enable-nonfree` para incluir códecs de entrega populares, lo que arrastra toda la obra a GPL. Incompatible con una app MIT distribuida como bundle. **No se usa en ninguna variante.** |
| **`libheif-js`** | **LGPL-3.0** (verificado). Además arrastra las patentes de HEVC. Doble motivo. |
| `heic2any` | MIT en la envoltura, pero empaqueta libheif compilado a WASM: la licencia efectiva del artefacto distribuido es LGPL-3.0. La declaración MIT del `package.json` **no es de fiar aquí**; es exactamente el caso que la skill `licencias-permisivas` debe atrapar. |
| Codificador MP3 (LAME) | LGPL. Se ofrecen **Opus, WAV y AAC** en su lugar. Ver ADR-0006. |
| SF Pro / SF Mono / New York, SF Symbols | Licencia de Apple restringida a plataformas Apple; no se pueden servir desde una web. |
| `next-pwa` y similares | MIT, pero sin mantenimiento activo y opacas. El service worker se escribe a mano (~120 líneas) y así es auditable. |
