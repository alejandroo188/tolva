# TOLVA — Plan de ejecución

**Conversión y edición de imágenes y vídeo, 100 % en el navegador.**

Documento de trabajo aprobado. Fecha: 2026-09-05. Autor del plan: sesión `exports-1d`.
Ejecutor: sesión `ejecutor del plan`. Este documento es la única fuente de verdad del alcance;
si algo contradice a este fichero, gana este fichero.

---

## 0. Cómo usar este documento

1. Léelo entero antes de escribir una línea.
2. Ejecuta los hitos **en orden**. Un hito no se cierra hasta que **todos** sus criterios de
   aceptación están ejecutados y vistos pasar.
3. Al cerrar cada hito: actualiza `PROGRESS.md`, commit con Conventional Commits, PR a `staging`.
4. **Sin humo.** Si un test no se puede ejecutar en este entorno, escríbelo en `PROGRESS.md` con
   el motivo y la alternativa, y dilo en el resumen. No marques como hecho nada que no hayas visto pasar.
5. No pidas confirmación paso a paso. Decide y documenta. Interrumpe sólo por: decisión legal
   nueva, coste, credencial que no tengas, o ambigüedad de producto que cambie la arquitectura.

**Ubicación del proyecto:** `/Users/alejandro/orca/projects/tolva` (este mismo directorio).
El worktree `/Users/alejandro/orca/workspaces/clash/exports` es de otro proyecto (Clash Royale). No lo toques.

---

## 1. Decisiones ya cerradas por el usuario

| Decisión | Valor |
|---|---|
| Nombre | **Tolva** — el depósito por donde se vierte material para procesarlo. Es la metáfora literal de la zona de arrastre. |
| Licencia del proyecto | **MIT** |
| PDF | **Fuera de la v1.** Se deja ADR escrito y arquitectura preparada para v1.1. |
| Repositorio | **Público**, en `github.com/alejandroo188/tolva` |
| Dominio | `tolva.dev` libre a fecha de hoy (comprobación DNS, no vinculante). `tolva.app`, `.com`, `.es`, `.io` ocupados. Mientras no se compre, se usan los dominios `*.vercel.app`. |
| Paquete npm `tolva` | Libre (registro devuelve 404). No se publica en npm en v1, pero el nombre queda reservado de facto. |

---

## 2. Fase 0 — Skills disponibles y uso previsto

### Inventario real de este entorno

No existen `/mnt/skills/public`, `/mnt/skills/examples` ni `.claude/skills/` en esta máquina.
Todas las skills vienen de plugins instalados en `~/.claude/plugins/cache/`:

| Plugin | Skills relevantes para este proyecto |
|---|---|
| `example-skills@anthropic-agent-skills` | **frontend-design**, **webapp-testing**, skill-creator, doc-coauthoring, theme-factory, canvas-design, brand-guidelines, algorithmic-art, web-artifacts-builder, mcp-builder, internal-comms, slack-gif-creator |
| `document-skills@anthropic-agent-skills` | pdf, docx, xlsx, pptx |
| `claude-api@anthropic-agent-skills` | claude-api |
| `claude-seo@claude-community` | 20+ skills de SEO (`seo-technical`, `seo-schema`, `seo-page`, …) |
| Nativas del harness | `artifact-design`, `artifact-diagramming`, `dataviz`, `design`, `run`, `code-review`, `security-review`, `simplify`, `init`, `update-config` |

### Qué skills se usan y cuándo (los dos párrafos pedidos)

**frontend-design** es la skill que gobierna todo el Hito 2 y vuelve a consultarse en los Hitos 4
y 6. No es opcional: el proceso de dos pasadas que exige (primero un plan compacto de color, tipo,
layout y principios; después una crítica contra el brief para eliminar lo que sea un default
genérico; sólo entonces código) es exactamente el antídoto contra el riesgo principal de este
proyecto, que es entregar otra plantilla SaaS de tarjetas redondeadas. La sección §7 de este plan
ya fija las restricciones duras (paleta prohibida, tipografía única, el elemento con volumen
visual) para que la pasada de crítica tenga contra qué medirse. **webapp-testing** se usa desde el
Hito 2 en adelante para conducir el navegador y hacer capturas de crítica visual, y como base del
arnés de integración con workers del Hito 3. **security-review** se ejecuta antes de la PR final de
`staging` a `main`, y **code-review** al cerrar cada hito con cambios de más de ~400 líneas.

**skill-creator** se usa una sola vez, en el Hito 0, para crear una skill de proyecto reutilizable:
`.claude/skills/licencias-permisivas/` — el procedimiento de verificar la licencia de una dependencia
*antes* de instalarla (consulta al registro npm, comprobación del `LICENSE` del repositorio de
origen, comprobación de las licencias de los binarios WASM subyacentes que el `package.json` no
declara, y actualización de `THIRD_PARTY_NOTICES.md`). Es el gesto que más se repite en este
proyecto y el que más caro sale si se hace de memoria. No se crean más skills: una skill de
convenciones de commit sería redundante con commitlint, y una de checklist de despliegue sería
redundante con el workflow de CI. Las skills de `claude-seo` y `document-skills` no se usan; se
descartan explícitamente para que no haya duda de que se han mirado.

---

## 3. Investigación previa — datos verificados hoy

Todo lo de esta sección está comprobado contra la fuente, no de memoria. El ejecutor debe volcarlo
en `docs/RESEARCH.md` **ampliándolo**, no copiándolo, y re-verificando los datos que hayan
cambiado.

### 3.1 Soporte de navegadores (caniuse, consultado 2026-09-05)

| Capacidad | Uso global | Detalle |
|---|---|---|
| **WebCodecs** | 94,47 % | Chrome/Edge 94+, Firefox 130+, Safari parcial 16.4–18.7 y **completo desde 26.0**. Firefox Android sin soporte. |
| **AVIF (decodificación)** | 95,36 % | Chrome 85+, Firefox 93+, Safari 16.4+ (parcial 16.1), iOS 16+. |
| **OffscreenCanvas** | 95,99 % | Chrome 69+, Edge 79+, Firefox 105+, Safari 17+ (parcial 16.2–16.6). |
| **JPEG XL** | **14,63 %** | Desactivado por defecto en Chrome (145+) y Firefox; **parcial en Safari 17+**. |
| **File System Access API** | **30,85 %** | Sólo Chromium 105+. Firefox tiene posición pública «harmful». Safari no. Nada en móvil. |
| **HEIC/HEIF** | Sólo Apple | Safari 17+ / macOS Sonoma+ / iOS 17+ decodifican vía el códec del sistema, accesible desde `createImageBitmap`. Chrome y Firefox lanzan excepción: no envían decodificador HEVC por el coste y la disputa de las patentes (MPEG LA, HEVC Advance, Velos Media). |

**Consecuencias de producto que se derivan de esto:**

- **JPEG XL sólo tiene sentido como formato de salida, con aviso.** Podemos *codificar* JXL con el
  WASM de jSquash aunque el navegador no lo sepa mostrar. La UI debe decir literalmente que el
  fichero resultante no se verá en la mayoría de navegadores. Es una función legítima (archivo,
  fotografía) que ningún conversor de cliente ofrece bien.
- **File System Access no puede ser el camino principal de guardado.** Se usa como mejora
  progresiva en Chromium (elegir carpeta de destino en lote); el camino por defecto es
  `<a download>` con object URL, y en lote un ZIP.
- **HEIC se lee sólo donde el sistema operativo lo permite.** Ver ADR-0005.

### 3.2 Herramientas de referencia (comprobadas hoy)

| Herramienta | Dónde procesa | Formatos / alcance | Límites declarados |
|---|---|---|---|
| **Squoosh** (Google Chrome Labs, Apache-2.0) | **Cliente**, declarado explícitamente: «Squoosh does not send your image to a server. All image compression processes locally.» | Compresión y conversión de imagen con códecs WASM | Sin límites de tamaño. Una imagen cada vez; sin lote, sin recorte real, sin vídeo. |
| **TinyPNG** | **Servidor** (retención declarada de 48 h) | JPEG XL, AVIF, WebP, JPG, PNG, APNG | **20 imágenes a la vez, 5 MB cada una**; conversión de formato gratis sólo para **3 imágenes**. |
| **iLoveIMG** | Servidor | JPG, PNG, SVG, GIF, TIF, PSD, WEBP, HEIC, RAW. Herramientas: comprimir, redimensionar, recortar, convertir, marca de agua, quitar fondo, pixelar caras, meme | No publica los límites del plan gratuito en portada; el lote y las funciones de IA son de pago. |
| **CloudConvert** | Servidor (retención según política; auditoría externa) | **212 formatos** en 11 categorías | Minutos de conversión y tamaños no publicados en portada; requieren cuenta. |
| **HandBrake** | Escritorio, GPL-2.0 | Transcodificación de vídeo | No es web. Interesa por su **modelo de presets** ("Fast 1080p30", "Web Optimized"), que es lo que copiamos como *patrón*. |
| **Photopea / Canva / Figma** | Cliente (Photopea) / servidor | Editores | Interesan por el **modelo de editor**: lienzo + panel de propiedades + historial no destructivo. |

**Nuestro hueco competitivo, en una frase:** Squoosh demuestra que el cliente basta pero se queda
en una imagen y sin vídeo; los conversores de servidor tienen el alcance pero imponen límites de
tamaño y cantidad porque cada fichero les cuesta dinero. Tolva hace lote y vídeo **sin límite de
tamaño**, porque el coste marginal de un fichero es cero para nosotros.

### 3.3 Qué NO vamos a copiar — declaración explícita

Esta declaración se copia literalmente al principio de `docs/RESEARCH.md`:

> Nos inspiramos en **patrones de interacción** (arrastrar y soltar, cola de trabajos, comparador
> antes/después con divisor, presets con nombre, panel de propiedades junto al lienzo). Los patrones
> de interacción no son objeto de protección por derechos de autor. **No copiamos ni reutilizamos**
> nombres, marcas, logotipos, paletas de color, iconografía, ilustraciones, textos de interfaz,
> textos legales, ni disposiciones de pantalla reconocibles de Squoosh, iLoveIMG, TinyPNG,
> CloudConvert, Convertio, HandBrake, Photopea, Canva, Figma ni de ninguna otra herramienta.
> No se ha inspeccionado ni derivado código de ninguna de ellas. La única excepción declarada es
> jSquash, que es un derivado *publicado bajo Apache-2.0* de los códecs de Squoosh y se consume
> como dependencia npm con su atribución en `THIRD_PARTY_NOTICES.md`.

### 3.4 Restricciones de la plataforma (Vercel, docs consultadas hoy)

Plan **Hobby**: duración máxima de función 60 s (por defecto 10 s) · tiempo de build 45 min ·
subida de ficheros estáticos 100 MB · 100 despliegues al día · 1 build concurrente ·
**no se pueden conectar repositorios propiedad de una organización de Git a un equipo Hobby**
(el nuestro es personal, así que no aplica).

Esto cierra el argumento del §2.1 del brief con números: un vídeo de 200 MB ni siquiera cabe en el
cuerpo de una petición, y 60 s no transcodifican nada. **Y hay una consecuencia mejor:** como no
necesitamos ninguna función, el proyecto se compila con `output: 'export'` — HTML, CSS, JS y WASM
estáticos, cero funciones desplegadas. La promesa de privacidad deja de ser una política y pasa a
ser una propiedad estructural: **no existe ningún endpoint al que subir un fichero.**

> Nota para el usuario: el plan Hobby de Vercel es para uso personal no comercial según sus
> condiciones. Si Tolva llegara a monetizarse haría falta plan Pro.

---

## 4. Arquitectura

### 4.1 Principio y su garantía técnica

Todo el procesado ocurre en el dispositivo. Eso no se sostiene con una promesa en la política de
privacidad, sino con **tres capas de garantía**, en orden de fuerza:

1. **Estructural** — `output: 'export'`. No hay funciones serverless, no hay rutas de API, no hay
   backend. No existe destino al que subir nada.
2. **Impuesta por el navegador** — cabecera CSP con `connect-src 'self'` y `form-action 'none'`.
   Aunque alguien introdujera código de subida, el navegador lo bloquearía.
3. **Verificada en CI** — un test E2E intercepta todo el tráfico de red durante una conversión
   completa y falla si aparece cualquier petición que no sea a un asset estático del propio origen.

### 4.2 Flujo de datos

```
  Archivo (File)
      │  nunca sale del proceso del navegador
      ▼
  ┌─────────────────────────────────────────────────────┐
  │ Hilo principal (React)                              │
  │  · UI, cola, estado (Zustand)                       │
  │  · NUNCA decodifica ni codifica                     │
  └───────────────┬─────────────────────────────────────┘
                  │ Comlink (postMessage + transferables)
      ┌───────────┴────────────┐
      ▼                        ▼
 ┌──────────────────┐   ┌──────────────────────┐
 │ Pool de workers  │   │ Worker de vídeo      │
 │ de imagen (2–6)  │   │ (uno, serializado)   │
 │                  │   │                      │
 │ decode  ─────────┤   │ Mediabunny           │
 │  · createImage-  │   │  · demux             │
 │    Bitmap nativo │   │  · WebCodecs decode  │
 │  · jSquash WASM  │   │  · ops por frame     │
 │ ops ─────────────┤   │  · WebCodecs encode  │
 │  · OffscreenCanvas   │  · mux               │
 │  · WebGL filtros │   │                      │
 │ encode ──────────┤   └──────────┬───────────┘
 │  · toBlob nativo │              │
 │  · jSquash WASM  │              │
 └────────┬─────────┘              │
          └──────────┬─────────────┘
                     ▼
              Blob → object URL
                     ▼
        <a download>  ·  ZIP (fflate)  ·  FSA API (opcional)
```

### 4.3 Modelo de edición no destructivo

El corazón del dominio es una **receta** serializable, no un bitmap mutado:

```ts
type EditRecipe = {
  source: { id: string; name: string; type: string; bytes: number;
            width: number; height: number; exifOrientation: 1|2|3|4|5|6|7|8 };
  ops: Op[];                 // crop → rotate → flip → resize → adjust → watermark
  output: { format: OutputFormat; quality: number; stripMetadata: boolean;
            maxBytes?: number };
};
```

Consecuencia deliberada: **toda la matemática del producto es pura y se testea en Node sin
navegador** (`src/lib/domain/`). El worker es sólo el ejecutor de la receta. Esta separación es lo
que hace que la matriz de tests unitarios del §8 sea real y no decorativa.

### 4.4 Orquestación de workers

- **Comlink** (Apache-2.0) para el RPC. Progreso vía `Comlink.proxy(callback)`.
- **Pool de imagen:** `clamp(navigator.hardwareConcurrency - 1, 2, 6)` workers. Cada trabajo es
  independiente; la cola reparte por round-robin y reintenta una vez ante fallo transitorio.
- **Vídeo: un solo worker.** Los codificadores de WebCodecs ya usan el hardware; paralelizar
  trabajos de vídeo compite por el mismo encoder y empeora el resultado. La cola de vídeo es FIFO
  estricta.
- **Cancelación:** cada trabajo recibe un `AbortSignal`; el worker comprueba `signal.aborted` entre
  frames y en cada iteración del bucle de codificación, cierra el encoder con `close()` y libera
  `VideoFrame`/`ImageBitmap`. Un trabajo cancelado debe dejar memoria en el mismo nivel que antes de
  empezar (verificado en el Hito 9 con `performance.measureUserAgentSpecificMemory()` donde exista,
  y con conteo de `VideoFrame` no cerrados siempre).
- **Presión de memoria:** el vídeo se procesa en streaming frame a frame; nunca se materializa el
  fichero completo descodificado. Límite duro: si `frames en vuelo > 8`, el productor espera.

### 4.5 Aislamiento de origen

Se activan `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Embedder-Policy: require-corp`.
Coste: no podríamos incrustar recursos de terceros — y no incrustamos ninguno. Beneficio:
`crossOriginIsolated === true`, luego `SharedArrayBuffer`, luego builds multihilo de WASM donde
jSquash los publique. Ver ADR-0010.

---

## 5. Stack y matriz de dependencias

**Todas las licencias de esta tabla están verificadas hoy contra el registro de npm** (`license`
del `package.json` de la versión `latest`) y, en el caso de los binarios WASM, contra el repositorio
de origen. Ninguna es GPL, AGPL ni LGPL.

### 5.1 Producción

| Paquete | Versión | Licencia | Por qué |
|---|---|---|---|
| `next` | 16.3.4 | MIT | App Router + `output: 'export'`. Despliegue en Vercel de primera clase. |
| `react` / `react-dom` | 19.2.8 | MIT | — |
| `tailwindcss` | 4.3.3 | MIT | v4 es CSS-first: los tokens **son** variables CSS nativas, que es justo lo que pide el brief. Sin `tailwind.config.js` con valores mágicos. |
| `zustand` | 5.0.15 | MIT | Estado de cola y editor. Sin sobreingeniería. |
| `comlink` | 4.4.2 | Apache-2.0 | RPC con workers. |
| **`mediabunny`** | 1.55.7 | **MPL-2.0** | **Toda la capa de vídeo.** TypeScript puro, **cero dependencias**. Lee y escribe MP4, MOV, WebM, MKV, MP3, WAV, OGG, AAC/ADTS, FLAC, MPEG-TS (+ HLS en lectura). 25+ códecs. Se apoya en WebCodecs para acelerar por hardware y aporta el muxing/demuxing que WebCodecs no cubre. Su licencia permite uso comercial y código cerrado. |
| `@jsquash/avif` | 2.1.1 | Apache-2.0 | Codifica/decodifica AVIF (libavif, **BSD-2-Clause**). |
| `@jsquash/jxl` | 1.3.0 | Apache-2.0 | JPEG XL (libjxl, **BSD-3-Clause**). |
| `@jsquash/webp` | 1.5.0 | Apache-2.0 | WebP con control fino (libwebp, **BSD-3-Clause**). |
| `@jsquash/jpeg` | 1.6.0 | Apache-2.0 | MozJPEG (**IJG + Zlib + BSD-3-Clause**), mejor que `toBlob` a igual calidad. |
| `@jsquash/png` | 3.1.1 | Apache-2.0 | PNG (crate `png` de Rust). |
| `@jsquash/oxipng` | 2.3.0 | Apache-2.0 | Optimización PNG sin pérdida (oxipng, **MIT**). |
| `@jsquash/resize` | 2.1.1 | Apache-2.0 | **Remuestreo Lanczos** y variantes. Es la pieza que pide el brief para redimensionar con calidad. |
| `utif2` | 4.1.0 | MIT | Lectura de TIFF (ningún navegador la ofrece salvo Safari). |
| `gifuct-js` | 2.1.2 | MIT | Descomposición de GIF animado en frames sin depender de `ImageDecoder` (que es sólo Chromium). |
| `gifenc` | 1.0.3 | MIT | Codificación de GIF con cuantización. |
| `exifreader` | 4.44.1 | MPL-2.0 | Lectura de EXIF/XMP/IPTC. |
| `fflate` | 0.8.3 | MIT | ZIP en streaming para el lote. Muy pequeño. |
| `lucide-react` | 1.41.0 | ISC | Iconografía. **Nada de SF Symbols.** |
| `@fontsource-variable/inter` | 5.3.0 | **OFL-1.1** | Inter variable autoalojada como *fallback* del stack de sistema. **No se sirve SF Pro, SF Mono ni New York.** |
| `nanoid` | 6.0.1 | MIT | IDs de trabajos. |
| `next-themes` | 0.4.6 | MIT | Claro/oscuro/sistema sin parpadeo. |
| `wasm-feature-detect` | 1.9.0 | Apache-2.0 | Detección de SIMD e hilos en WASM. |

**BMP** no lleva dependencia: el formato es trivial y se escribe un codificador propio (~60 líneas,
BITMAPINFOHEADER de 24/32 bits). La lectura de BMP la da `createImageBitmap` de forma nativa.
**SVG** se rasteriza cargándolo en un `<img>` desde un blob URL — un `<img>` no ejecuta el script
embebido en un SVG, así que no hay superficie de XSS; se documenta en el código.

### 5.2 Desarrollo y CI

| Paquete | Versión | Licencia |
|---|---|---|
| `typescript` (strict) | latest 5.x | Apache-2.0 |
| `vitest` + `@vitest/coverage-v8` | 5.0.0 | MIT |
| `happy-dom` | 20.14.0 | MIT |
| `@playwright/test` | 1.63.0 | Apache-2.0 |
| `@axe-core/playwright` | 4.13.0 | MPL-2.0 |
| `@lhci/cli` | 0.15.1 | Apache-2.0 |
| `size-limit` + `@size-limit/file` | 13.0.3 | MIT |
| `license-checker-rseidelsohn` | 5.0.1 | BSD-3-Clause |
| `husky` 9.1.7 / `lint-staged` 17.5.0 | — | MIT |
| `@commitlint/cli` + `config-conventional` | 21.2.2 | MIT |
| `eslint`, `eslint-plugin-jsx-a11y` 6.10.2, `prettier` | — | MIT |
| `serve` | 14.2.6 | MIT |

### 5.3 Rechazados, con motivo escrito

| Rechazado | Motivo |
|---|---|
| **`@ffmpeg/core` / ffmpeg.wasm** | El paquete publicado declara **`GPL-2.0-or-later`** en npm (verificado hoy en la versión 0.12.10). El build habitual usa `--enable-gpl` y `--enable-nonfree` precisamente para incluir códecs de entrega populares, lo que arrastra toda la obra a GPL. Incompatible con una app MIT distribuida como bundle. **No se usa en ninguna variante.** |
| **`libheif-js`** | **LGPL-3.0** (verificado). Además arrastra las patentes de HEVC. Doble motivo. |
| `heic2any` | MIT en la envoltura, pero empaqueta libheif compilado a WASM: la licencia efectiva del artefacto distribuido es LGPL-3.0. La declaración MIT del `package.json` **no es de fiar aquí**, y ese es exactamente el tipo de caso que la skill `licencias-permisivas` debe atrapar. |
| Codificador MP3 (LAME) | LGPL. Se ofrecen **Opus, WAV y AAC** en su lugar. Ver ADR-0006. |
| SF Pro / SF Mono / New York, SF Symbols | Licencia de Apple restringida a interfaces de apps en plataformas Apple; no se pueden servir desde una web. |
| `next-pwa` y similares | MIT, pero sin mantenimiento activo y opacas. El service worker se escribe a mano (~120 líneas) y así es auditable. |

### 5.4 Nota sobre MPL-2.0 (mediabunny, exifreader, axe-core)

MPL-2.0 es *copyleft por fichero*, no viral hacia la obra mayor. Su cláusula 3.3 permite
expresamente distribuir la obra mayor bajo otros términos. Obligaciones reales que asumimos:

1. Conservar los avisos de copyright y licencia (los mantiene el bundler; se refuerza con
   `THIRD_PARTY_NOTICES.md` y la página `/licencias`).
2. Enlazar desde `/licencias` al código fuente de cada dependencia MPL (§3.2 exige informar de cómo
   obtener la forma fuente).
3. **Si en algún momento parcheamos un fichero de mediabunny, ese fichero sigue siendo MPL y hay
   que publicar la modificación.** Regla de proyecto: **no se parchean forks de dependencias MPL.**
   Si hace falta un arreglo, se envía aguas arriba o se rodea desde código propio.

Esto va escrito en `CONTRIBUTING.md` y en `docs/LEGAL_DECISIONS.md`.

### 5.5 Patentes de códecs — posición del proyecto

H.264 y HEVC tienen obligaciones de patente **independientes de la licencia del software**.
La posición de Tolva:

- **No distribuimos ningún códec H.264/HEVC.** Cuando el usuario exporta MP4/H.264, quien codifica
  es el navegador o el sistema operativo del usuario, con las licencias que ya tiene cubiertas.
  Nosotros sólo pedimos `VideoEncoder.configure({codec:'avc1...'})`.
- **La pila libre de regalías es AV1 + VP9 + Opus + WebM.** La UI **siempre** ofrece una salida
  libre junto a la de compatibilidad, y el preset por defecto de «Web ligero» usa VP9/Opus en WebM.
- Se documenta en `docs/LEGAL_DECISIONS.md` y en la página `/licencias`.

---

## 6. Estructura de carpetas

```
tolva/
├─ .claude/skills/licencias-permisivas/SKILL.md
├─ .github/
│  ├─ workflows/{ci.yml, lighthouse.yml}
│  ├─ ISSUE_TEMPLATE/{bug.yml, feature.yml}
│  ├─ pull_request_template.md
│  └─ CODEOWNERS
├─ docs/
│  ├─ ARCHITECTURE.md · RESEARCH.md · LEGAL_DECISIONS.md · MANUAL_QA.md
│  └─ adr/0001-… (ver §9.4)
├─ public/
│  ├─ fonts/inter/*.woff2      · icons/ · manifest.webmanifest
│  └─ sw.js                    (generado por scripts/gen-sw.ts)
├─ scripts/
│  ├─ check-licenses.ts        · gen-third-party-notices.ts
│  ├─ gen-fixtures.ts          · gen-sw.ts · check-bundle-budget.ts
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx · page.tsx · imagen/page.tsx · video/page.tsx
│  │  ├─ (legal)/{aviso-legal,privacidad,cookies,terminos,licencias}/page.tsx
│  │  └─ dev/{ui,harness}/page.tsx        ← excluidas del build de producción
│  ├─ components/{primitives,editor,queue,layout}/
│  ├─ lib/
│  │  ├─ domain/          ← 100 % puro, testeable en Node
│  │  │  ├─ recipe.ts · geometry.ts · aspect.ts · crop.ts · resize.ts
│  │  │  ├─ filenames.ts · bytes.ts · quality.ts
│  │  ├─ capabilities/    ← detección con globals inyectables
│  │  ├─ codecs/          ← cargadores dinámicos (import() perezoso)
│  │  ├─ media/           ← image-pipeline.ts · video-pipeline.ts
│  │  ├─ workers/         ← image.worker.ts · video.worker.ts · pool.ts
│  │  └─ store/           ← queue.ts · editor.ts · prefs.ts
│  ├─ config/{social-presets.json, video-presets.json}   ← editables sin tocar código
│  └─ styles/{tokens.css, globals.css}
├─ tests/
│  ├─ unit/ · integration/ · e2e/
│  └─ fixtures/{README.md, LICENSES.md, images/, video/}
├─ vercel.json · next.config.ts · playwright.config.ts · vitest.config.ts
├─ LICENSE (MIT) · THIRD_PARTY_NOTICES.md
└─ README.md · CONTRIBUTING.md · CHANGELOG.md · PROGRESS.md
```

---

## 7. Dirección visual

**Antes de escribir una línea de CSS, invoca la skill `frontend-design` y ejecuta su proceso de dos
pasadas.** Esta sección es el brief que su pasada de crítica debe usar como vara de medir.

### 7.1 Concepto: la báscula

El héroe de esta app no es un titular. **Es una cifra.** Tolva existe para producir un número —
«34,7 MB → 1,9 MB, −94 %» — y ese número, con la barra que encoge físicamente a su lado, es el
**único** elemento con volumen visual de toda la interfaz. Todo lo demás (controles, listas,
cabecera, ajustes) se mantiene callado, pequeño y ordenado. Es el consejo de Chanel aplicado:
se gasta toda la audacia en un sitio.

La pantalla inicial es la zona de arrastre a pantalla completa. No hay hero de marketing, ni
titular con una palabra en otro color, ni tres tarjetas de features. Se entiende en tres segundos
porque **sólo hay una cosa que hacer**.

### 7.2 Tipografía

Una sola familia: el stack de sistema (`-apple-system, BlinkMacSystemFont, "Segoe UI", …`), que en
dispositivos Apple renderiza SF de forma nativa y legítima, con **Inter variable autoalojada
(OFL-1.1)** como fallback. **No se añade una segunda familia.** Nada de monoespaciada para
etiquetas de datos: es uno de los tells que la skill señala.

La personalidad la da el **tratamiento** de la cifra, no una segunda tipografía: `tabular-nums`,
peso 600, tracking negativo (−0.03em), tamaño display, con la unidad en un peso y tamaño mucho
menores alineada a la línea base. El contraste de escala (56 px/600 contra 15 px/400) hace el
trabajo que en otras webs hace una tipografía decorativa.

Escala tipográfica como tokens, ritmo vertical con una base de 4 px. Longitud de línea < 80
caracteres en los textos legales.

### 7.3 Color

Modo claro por defecto, base blanca y grises muy suaves, un único acento vivo, semánticos para
éxito/aviso/error. Modo oscuro completo desde el primer commit, no como parche.

**Valores prohibidos, y el motivo:**

| Prohibido | Motivo |
|---|---|
| `#007AFF` | Es el azul de sistema de Apple: a la vez la elección obvia y color de marca ajena. |
| `#D97757` | Es el acento de la propia interfaz de Claude; en un brief de usuario delata generación automática. |
| `#F4F1EA` y cremas cercanas | Es el fondo cliché del diseño generado por IA. |
| `#0B0B0B`, `#111` como «negro» | Falso negro tintado, tell de plantilla. |

**Candidatos de acento a evaluar en la pasada de la skill** (elige uno y justifícalo por escrito en
`docs/adr/0015-acento.md`):

- **Cian de mesa de luz**, alta croma, en torno a `oklch(0.62 0.14 210)`. Instrumental, ligado al
  tema (luz, píxeles, óptica), claramente distinto del azul de Apple, y deja el verde libre para
  «éxito» sin colisión.
- **Índigo saturado**, en torno a `oklch(0.52 0.20 275)`. Más rotundo en oscuro, algo más común en
  producto.

Base neutra: blanco puro para la superficie de trabajo (donde va la imagen, para no falsear el
color que el usuario juzga) y un gris frío muy tenue para el chrome.

### 7.4 Prohibiciones de layout (checklist de la pasada de crítica)

- Sin *eyebrow* en mayúsculas espaciadas sobre cada título.
- Sin cadenas de metadatos unidas con «·».
- Sin «→» pegado al texto de botones y enlaces.
- Sin numeración 01/02/03 salvo que el contenido sea de verdad una secuencia (la cola de trabajos
  sí lo es; una lista de formatos no).
- Sin trocear todo en tarjetas redondeadas idénticas con la misma sombra gris `rgba(0,0,0,.1)`.
  El radio codifica jerarquía: escala 8/12/16/20/28, y cada uno significa algo (control / campo /
  panel / hoja modal / superficie principal).
- Sin lavados de degradado como decoración.

### 7.5 Materiales y movimiento

- Translucidez sutil (`backdrop-filter: saturate(1.6) blur(20px)`) sólo en la barra superior y en
  las hojas modales, con fallback sólido vía `@supports not (backdrop-filter: blur(1px))`.
- Componentes: hojas modales que suben desde abajo en móvil (`<dialog>` nativo + animación),
  segmented controls, switches, listas agrupadas, botones grandes con estado de pulsación.
- **Un solo momento orquestado de movimiento**: la transición de «archivo soltado» a «archivo
  listo», donde la barra encoge una vez y la cifra cuenta hasta su valor. Nada de fade-up por
  sección ni transición de hover en cada tarjeta.
- 150–300 ms, curvas suaves, `prefers-reduced-motion: reduce` respetado en todo (la cifra aparece
  ya en su valor final, la barra ya encogida).

### 7.6 Suelo de calidad no negociable

Móvil primero, verificado a **360 / 768 / 1024 / 1440 px** en claro y oscuro. Áreas táctiles ≥ 44 px.
Safe areas de iOS (`env(safe-area-inset-*)`). WCAG 2.2 AA: contraste, foco visible siempre,
navegación completa por teclado, roles ARIA, textos alternativos, y el progreso de la cola anunciado
a lectores de pantalla vía `aria-live="polite"` con actualizaciones limitadas (no en cada frame).

---

## 8. Matriz de pruebas

### 8.1 Unitarios — Vitest, entorno `node`, sin navegador

Sobre `src/lib/domain/` (puro por diseño). **Umbral de cobertura: ≥ 90 % líneas y ramas en
`src/lib/domain/**`, comprobado en CI.**

| Módulo | Qué se prueba |
|---|---|
| `geometry.ts` | `fit`/`cover`/`contain`; redondeo a entero sin deriva acumulada; dimensión mínima 1 px; no ampliar por encima del original cuando la opción está activa. |
| `aspect.ts` | Proporciones 1:1, 4:3, 3:2, 16:9, 9:16, 4:5; conversión porcentaje ↔ píxeles; proporción bloqueada y libre. |
| `crop.ts` | Rectángulo de recorte fijado dentro de los límites; recorte con proporción fija al arrastrar cada asa; recorte con rotación libre (bounding box del rectángulo rotado); presets de redes leídos de `social-presets.json`. |
| `resize.ts` | Selección de algoritmo por factor de escala; cadena de pasos para reducciones grandes. |
| `filenames.ts` | Cambio de extensión; sufijos; colisiones (`foto.jpg`, `foto (1).jpg`); sanitizado de caracteres inválidos por sistema de ficheros; nombres Unicode; longitud máxima. |
| `bytes.ts` | Formateo en es-ES (coma decimal, `1,9 MB`); porcentaje de ahorro; ahorro negativo (el resultado pesa más) presentado con honestidad. |
| `recipe.ts` | Orden canónico de operaciones; serialización estable; validación de recetas inválidas. |
| `quality.ts` | Mapa calidad↔parámetros por códec; presets de vídeo → resolución/bitrate/fps. |
| `capabilities/` | Con globals **inyectados y mockeados**: sin `OffscreenCanvas`; sin `VideoEncoder`; `isConfigSupported` que devuelve `false`; `toBlob` que ignora el tipo pedido y devuelve PNG; `SharedArrayBuffer` ausente. Cada escenario debe producir un mensaje de degradación concreto, nunca una excepción. |

### 8.2 Integración — Playwright sobre `/dev/harness`

`jsdom`/`happy-dom` **no pueden** ejecutar canvas, WASM ni WebCodecs. Fingirlo sería humo. En su
lugar se expone una ruta `/dev/harness` (sólo en dev y test, excluida del build de producción) que
publica `window.__tolva` para conducir los workers directamente desde Playwright y afirmar sobre la
salida real.

| Caso |
|---|
| Ida y vuelta con el worker: receta → blob, con bytes mágicos correctos. |
| Callbacks de progreso: monótonos, empiezan en 0, terminan en 1, sin saltos hacia atrás. |
| Cancelación a mitad: en el 40 % de un vídeo de 300 frames; se resuelve como cancelado, no lanza, y no quedan `VideoFrame` sin cerrar. |
| Cola: 20 trabajos con un pool de 3 workers; se completan todos; concurrencia nunca supera el tamaño del pool. |
| Memoria: 15 imágenes de 4000×3000 en secuencia sin que crezca el heap de forma monótona. |
| Reintento tras un fallo inyectado. |
| Recuperación: worker que se cae (`self.close()` forzado) y el pool lo repone. |

### 8.3 E2E — Playwright, con ficheros reales

**Fixtures (§8.5).** Verificación por **bytes mágicos**, no por extensión:

| Formato | Firma |
|---|---|
| JPEG | `FF D8 FF` |
| PNG | `89 50 4E 47 0D 0A 1A 0A` |
| WebP | `52 49 46 46 …. 57 45 42 50` |
| AVIF | `…. 66 74 79 70 61 76 69 66` (`ftypavif`) |
| JPEG XL | `FF 0A` o `00 00 00 0C 4A 58 4C 20` |
| GIF | `47 49 46 38 (37\|39) 61` |
| BMP | `42 4D` |
| TIFF | `49 49 2A 00` / `4D 4D 00 2A` |
| MP4/MOV | `…. 66 74 79 70` |
| WebM/MKV | `1A 45 DF A3` |
| WAV | `52 49 46 46 …. 57 41 56 45` |
| Ogg/Opus | `4F 67 67 53` + `OpusHead` |
| ZIP | `50 4B 03 04` |

Recorridos obligatorios:

1. **Conversión de imagen**: subir → convertir a **cada** formato de destino → descargar → firma de bytes correcta.
2. **Recorte**: cada preset de redes → dimensiones exactas del resultado (decodificar el blob y comprobar `width`/`height`).
3. **Redimensionado** por píxeles y por porcentaje; opción «no ampliar» respetada.
4. **Lote de 20 imágenes** → ZIP → abrir el ZIP en el test (fflate en el contexto de página), comprobar 20 entradas, nombres sin colisión y cada entrada con su firma.
5. **Metadatos**: JPEG con EXIF (GPS + orientación 6) → se lee y se muestra; al exportar con «eliminar metadatos» el resultado **no contiene** ni el marcador APP1 ni la cadena GPS; la orientación se ha aplicado a los píxeles.
6. **Vídeo**: conversión de contenedor, trim (duración exacta ±1 frame), extracción de audio, vídeo→GIF, GIF→vídeo, cambio de 16:9 a 9:16 con relleno y con recorte, silenciar pista, cambio de velocidad.
7. **Casos límite**: fichero corrupto (JPEG truncado a la mitad), formato no soportado (`.psd`), fichero de 0 bytes, fichero enorme (~500 MB sintético), cancelación a media conversión, pérdida de foco de la pestaña durante el proceso (`page.evaluate` que dispara `visibilitychange`), y **doble carga del mismo fichero**. En todos: mensaje útil, nunca pantalla en blanco ni error críptico.
8. **Prueba de privacidad** (la que respalda la promesa): `page.route('**/*')` durante una conversión completa de imagen y otra de vídeo. Se afirma que **no existe ninguna petición** que (a) sea `POST`/`PUT`/`PATCH`, (b) vaya a un origen distinto del propio, o (c) lleve cuerpo. Además, `connect-src 'self'` presente en la cabecera CSP de la respuesta.
9. **Presupuesto de carga diferida**: antes de soltar el primer fichero, **cero peticiones a `.wasm`**. Tras soltar un JPEG y pedir AVIF, exactamente el módulo AVIF y ninguno más.
10. **Offline**: segunda visita con `context.setOffline(true)` → la app carga y convierte una imagen.
11. **Persistencia**: las preferencias sobreviven a la recarga; **ningún fichero de usuario aparece en `localStorage`, `sessionStorage` ni IndexedDB** (afirmación explícita).
12. **Teclado**: recorrido completo del editor sólo con teclado, con foco visible en cada parada.

### 8.4 Cross-browser y honestidad sobre lo que no se puede probar

Proyectos de Playwright: `chromium`, `firefox`, `webkit`, `Pixel 7`, `iPhone 14`.

**Limitaciones que hay que documentar y respetar, no disimular:**

- Desde Playwright 1.57 el Chromium por defecto es **Chrome for Testing**, que sí trae H.264/AAC.
  Los tests de H.264/MP4 se ejecutan **sólo** en el proyecto `chromium` y se marcan con
  `test.skip()` razonado en los demás.
- **WebKit de Playwright no es Safari.** Es muy probable que no exponga WebCodecs. Los tests de
  vídeo en `webkit` deben usar `test.skip(!await page.evaluate(() => 'VideoEncoder' in self), 'WebCodecs no disponible en el WebKit de Playwright')` y **quedar cubiertos por el guion manual del §11 sobre Safari real**. Escríbelo en `PROGRESS.md` y en el README como limitación conocida.
- El soporte de codificación H.264 en Firefox es limitado; ahí se prueba VP9/Opus en WebM.
- HEIC no es probable en ningún navegador de Playwright. Se prueba la **ruta de degradación**
  (mensaje claro) y la lectura real queda para el guion manual en un Mac o iPhone.
- JPEG XL se verifica por bytes mágicos del fichero producido, no por que el navegador lo muestre.

### 8.5 Fixtures — origen y licencia

**Por defecto, todas las fixtures son sintéticas y generadas por nosotros**, con
`scripts/gen-fixtures.ts` ejecutado dentro de Chromium vía Playwright (no hay ffmpeg en esta máquina
y tampoco lo queremos: es GPL en su build habitual). Así el origen y la licencia son triviales:
**son nuestras, MIT**.

- Imágenes: degradados deterministas, patrón de tablero con canal alfa, carta de color, foto
  sintética con ruido, 4000×3000 para el caso pesado, JPEG con EXIF inyectado (GPS + orientación 6),
  PNG con paleta, GIF animado de 10 frames, TIFF, BMP, SVG con `<text>` y `<path>`, JPEG truncado,
  fichero de 0 bytes.
- Vídeo: generados con **Mediabunny** dentro del navegador a partir de un patrón animado —
  5 s / 30 fps en VP9+Opus (WebM) y en H.264+AAC (MP4), más un clip de 1 s sin audio y otro sólo
  audio. Esto tiene la ventaja de que las fixtures se producen con la misma pila que probamos.
- `tests/fixtures/LICENSES.md` documenta cada fichero, su origen y su licencia. Si en algún momento
  se añade material externo, sólo se admite dominio público o licencia libre **verificada y anotada**
  (p. ej. Big Buck Bunny, CC-BY 3.0, Blender Foundation, con la atribución exacta). **Nada con derechos.**
- Las fixtures generadas se cachean en CI por hash del script para no regenerarlas en cada job.

### 8.6 Rendimiento y accesibilidad — umbrales que fallan la build

**Lighthouse CI** sobre el build estático servido con `serve`, en `/`, `/imagen`, `/video`,
`/privacidad`, perfil móvil:

| Métrica | Umbral |
|---|---|
| Performance | ≥ 95 |
| Accessibility | **= 100** |
| Best Practices | ≥ 95 |
| SEO | ≥ 95 |
| LCP | ≤ 1,8 s |
| CLS | ≤ 0,05 |
| TBT | ≤ 150 ms |

**axe-core** en `/`, `/imagen`, `/video` y las cinco rutas legales, en claro y oscuro:
**cero violaciones** de nivel `serious` o `critical`, y cero de nivel `moderate` sin justificación
escrita.

**Presupuesto de bundle** (`size-limit`, comprobado en CI):

| Recurso | Límite |
|---|---|
| JS inicial de `/` | **≤ 130 KB gzip** |
| CSS total | ≤ 25 KB gzip |
| Fuentes (Inter variable, subconjunto latino) | ≤ 60 KB |
| Transferencia total de primera carga | ≤ 250 KB gzip |
| Cualquier `.wasm` en la carga inicial | **0 bytes** (verificado además por el E2E nº 9) |

---

## 9. Git, CI y despliegue

### 9.1 Ramas y flujo

- `main` (producción) y `staging` (integración), ambas permanentes.
- `feat/*` · `fix/*` · `docs/*` · `chore/*` → PR a `staging` → validación en el despliegue de
  staging → PR de `staging` a `main`.
- Protección de `main` y `staging` (repo público, plan gratuito lo permite): sin push directo,
  PR obligatoria, checks de CI obligatorios en verde, conversaciones resueltas, historial lineal.
- Conventional Commits, forzado por commitlint en `commit-msg`.
- `CODEOWNERS`, plantillas de PR e issue, `CHANGELOG.md` mantenido a mano por hito.

### 9.2 CI — `.github/workflows/ci.yml`

Job **`calidad`** (ubuntu-latest, Node 22 LTS):
`npm ci` → `lint` → `typecheck` → **`licenses:check`** → **`notices:check`** → `test:unit` con
umbral de cobertura → `build` → `size-limit`.

- `licenses:check`: lista blanca **MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, 0BSD,
  CC0-1.0, Unlicense, BlueOak-1.0.0, OFL-1.1**. Lista negra explícita: cualquier **GPL, AGPL, LGPL,
  SSPL, BUSL, CC-BY-NC**, y cualquier paquete sin licencia declarada. Falla la build.
- `notices:check`: regenera `THIRD_PARTY_NOTICES.md` y falla si difiere del commiteado, para que el
  fichero no pueda quedarse obsoleto.

Job **`e2e`** (matriz `chromium` | `firefox` | `webkit`): genera fixtures (con caché), instala
navegadores, ejecuta Playwright, sube el reporte como artefacto.

Job **`lighthouse`** (sólo en PR a `staging` y `main`): build → `serve` → `lhci autorun` con los
umbrales del §8.6.

> **Aviso al ejecutor:** el token de `gh` de esta máquina tiene los scopes
> `admin:public_key, gist, read:org, repo`; **no tiene `workflow`**. El protocolo de git configurado
> es SSH, así que empujar ficheros de `.github/workflows/` funcionará. Si algún comando de la API
> falla por falta de scope, el usuario ejecuta `gh auth refresh -h github.com -s workflow`.

### 9.3 Vercel

Ambas credenciales están ya disponibles en esta máquina: `gh` autenticado como `alejandroo188`
y `vercel` (CLI 58.9.5) autenticado como `alejandroo188`. **El ejecutor puede hacerlo todo él.**

- Proyecto Vercel conectado al repo. `main` → producción. `staging` → despliegue permanente en la
  URL estable `tolva-git-staging-alejandroo188.vercel.app`. Ramas de feature → previews automáticas.
- Framework: Next.js con `output: 'export'`. Sin funciones. Sin variables de entorno con secretos
  (no hay backend); las de entorno se limitan a `NEXT_PUBLIC_ENV=production|staging` para que la
  cabecera de staging muestre un distintivo y `robots.txt` la desindexe.
- `vercel.json` — cabeceras para todas las rutas:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:;
  font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none';
  base-uri 'none'; form-action 'none'; frame-ancestors 'none'
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

`connect-src 'self'` no es decoración: **es la garantía de que el navegador bloquearía cualquier
intento de subida**, aunque el código lo intentara. Se menciona en la política de privacidad.

### 9.4 ADRs a escribir (formato: contexto, opciones, decisión, consecuencias)

| # | Título |
|---|---|
| 0001 | Procesamiento 100 % en cliente |
| 0002 | Export estático de Next: sin funciones serverless, la privacidad como propiedad estructural |
| 0003 | WebCodecs + Mediabunny en lugar de ffmpeg.wasm (con el análisis de licencias) |
| 0004 | Canvas nativo + jSquash para imagen |
| 0005 | HEIC: sólo decodificación nativa del sistema; se rechaza libheif |
| 0006 | Audio: Opus/WAV/AAC; sin MP3 en v1 |
| 0007 | Tipografía: stack de sistema + Inter (OFL); se rechazan las fuentes de Apple |
| 0008 | Iconografía: Lucide (ISC); se rechazan SF Symbols |
| 0009 | Licencia del proyecto: MIT |
| 0010 | Aislamiento de origen (COOP/COEP) y CSP como refuerzo técnico de la privacidad |
| 0011 | TIFF vía UTIF2; codificador BMP propio sin dependencia |
| 0012 | GIF: gifuct-js + gifenc, sin depender de `ImageDecoder` |
| 0013 | PDF fuera del alcance de la v1 |
| 0014 | Sin analítica ni cookies: por tanto, sin banner |
| 0015 | Elección del color de acento (lo escribe el Hito 2, tras la pasada de `frontend-design`) |

---

## 10. Hitos

> Regla de cierre, idéntica en todos: **build en verde + unitarios en verde + E2E en verde +
> lint/typecheck en verde + prueba funcional real con ficheros de ejemplo**. Si algo falla, se
> arregla y se repasa la batería completa antes de avanzar. Al cerrar: `PROGRESS.md` actualizado,
> commits convencionales, PR a `staging`, despliegue de staging verificado a mano.

---

### Hito 0 — Fundaciones, legalidad automatizada y tuberías

Repo público `alejandroo188/tolva` con `main` y `staging` protegidas. Next 16 + TS strict +
Tailwind v4 + ESLint/Prettier + husky/lint-staged + commitlint. Vitest y Playwright configurados.
Los cinco scripts de `scripts/`. Workflows de CI. Proyecto de Vercel conectado con los dos entornos.
`LICENSE` (MIT), `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `PROGRESS.md`.
`docs/RESEARCH.md` y `docs/LEGAL_DECISIONS.md` **completos** (no esqueletos), ADRs 0001–0014.
Skill `.claude/skills/licencias-permisivas/` creada con `skill-creator`.

**Criterios de aceptación**
- [ ] `npm run lint && npm run typecheck && npm run test:unit && npm run build` en verde.
- [ ] **Prueba negativa real del guardián de licencias:** instalar temporalmente un paquete GPL
      (p. ej. `@ffmpeg/core`), ejecutar `npm run licenses:check`, **verlo fallar señalando GPL-2.0-or-later**,
      desinstalarlo, verlo pasar. Pegar la salida de ambos casos en `PROGRESS.md`.
- [ ] `THIRD_PARTY_NOTICES.md` generado automáticamente, con paquete, versión, licencia, enlace y
      texto de licencia. `notices:check` falla si se edita a mano.
- [ ] CI en verde en una PR de prueba a `staging`.
- [ ] `staging` desplegado y accesible, con las cabeceras del §9.3 comprobadas con `curl -I`
      (pegar la salida en `PROGRESS.md`).
- [ ] `crossOriginIsolated === true` verificado en el despliegue de staging.
- [ ] Push directo a `main` rechazado por la protección de rama (probarlo de verdad).

---

### Hito 1 — Núcleo de dominio, sin una línea de UI

Todo `src/lib/domain/` y `src/lib/capabilities/`. Los ficheros
`src/config/social-presets.json` y `video-presets.json` con sus tipos y su validación.

**Criterios de aceptación**
- [ ] Toda la §8.1 escrita y en verde.
- [ ] Cobertura ≥ 90 % líneas y ramas en `src/lib/domain/**`, forzada en CI.
- [ ] Cero importaciones de APIs del navegador en `domain/` (regla de ESLint que lo impide).
- [ ] Presets de redes cubriendo al menos: avatar, historia 9:16, post 1:1, post 4:5, portada,
      miniatura 16:9, y editables sin tocar código.

---

### Hito 2 — Sistema de diseño y shell de la aplicación

**Se abre invocando `frontend-design` y ejecutando su proceso de dos pasadas contra el §7.**
Produce: el plan de diseño escrito, la crítica anti-default con lo que se cambió y por qué,
`docs/adr/0015-acento.md`, `src/styles/tokens.css`, los primitivos
(Button, IconButton, Segmented, Switch, Slider, Sheet, ListGroup, Toast, ProgressBar, Tooltip),
el layout con cabecera y pie, claro/oscuro/sistema, y las cinco rutas legales aún vacías.
Ruta `/dev/ui` (sólo dev) con todos los primitivos en todos sus estados.

**Criterios de aceptación**
- [ ] Cero valores de color, espaciado, radio, sombra o tipografía escritos a pelo fuera de
      `tokens.css` (regla de lint o script de comprobación).
- [ ] Capturas de Playwright a 360/768/1024/1440 px en claro y oscuro, revisadas de verdad, sin
      desbordamiento horizontal en ninguna.
- [ ] axe-core sin violaciones en `/dev/ui` y en las rutas legales, en ambos modos.
- [ ] Recorrido completo por teclado con foco visible en cada primitivo.
- [ ] `prefers-reduced-motion` verificado con `emulateMedia`.
- [ ] La crítica anti-default escrita, con al menos una decisión revisada y su motivo.

---

### Hito 3 — Motor de imagen en worker

Pool de workers, decodificación (nativa + jSquash + UTIF2 + gifuct-js + rasterizado de SVG),
las operaciones de la receta sobre OffscreenCanvas/WebGL, codificación a JPEG, PNG, WebP, AVIF,
JXL, GIF, BMP y TIFF (lectura), lectura de EXIF y borrado al exportar, carga diferida real de cada
códec. Ruta `/dev/harness`.

**Criterios de aceptación**
- [ ] Integración §8.2 en verde para imagen.
- [ ] Conversión real de una fixture a **cada** formato de salida, verificada por bytes mágicos.
- [ ] Lanczos comprobado: reducción 4000→400 px sin aliasing perceptible frente a la línea base de
      `drawImage`, medida con una métrica objetiva simple (energía de alta frecuencia).
- [ ] Orientación EXIF 6 aplicada a los píxeles al cargar.
- [ ] Al exportar con borrado de metadatos, el fichero no contiene APP1 ni GPS.
- [ ] Cero `.wasm` cargados hasta que se pide el formato correspondiente.
- [ ] El hilo principal no se bloquea: `TBT` durante una conversión de 4000×3000 por debajo de
      50 ms, medido con `PerformanceObserver` de tareas largas.

---

### Hito 4 — Interfaz de imagen

Zona de arrastre a pantalla completa, selector, pegado desde portapapeles. Cola con progreso real,
cancelación y reintento. Editor: recorte libre y con proporciones y presets, reglas de composición,
zoom y reposicionado, rotación 90/180/270 y libre con enderezado, volteos, ajustes
(brillo, contraste, saturación, temperatura, escala de grises), marca de agua de texto o imagen.
Comparador antes/después con divisor arrastrable. Panel de peso original, resultante y % de ahorro
—**el elemento héroe del §7.1**. Lote con los mismos ajustes para todos y descarga en ZIP.
Persistencia de preferencias. Atajos de teclado. Detección de capacidades con degradación elegante.

**Criterios de aceptación**
- [ ] E2E §8.3 recorridos 1–5, 7, 9, 11 y 12 en verde.
- [ ] Lote de 20 imágenes → ZIP con 20 entradas correctas.
- [ ] Cancelación a mitad del lote: los ya hechos se conservan, el resto no se procesa.
- [ ] Atajos documentados en la propia UI y probados.
- [ ] Con `VideoEncoder`/`OffscreenCanvas` mockeados como ausentes, mensaje claro y ruta alternativa,
      nunca un error críptico.
- [ ] Revisión visual con capturas en los cuatro anchos, claro y oscuro.

---

### Hito 5 — Motor de vídeo en worker

Mediabunny: demux, decode, operaciones, encode y mux. Conversión de contenedor y recodificación
(MP4, WebM, MOV, MKV, GIF). Presets «Móvil», «Redes sociales», «Web ligero», «Máxima calidad» más
modo manual. Trim con precisión de frame. Recorte de encuadre y cambio de proporción con relleno o
recorte. Vídeo→GIF y GIF→vídeo. Extracción de fotogramas y póster. Extracción de audio a WAV/Opus/AAC.
Silenciar pista. Cambio de velocidad. Estimación de tiempo restante y aviso honesto cuando el
fichero es demasiado grande para el dispositivo.

**Criterios de aceptación**
- [ ] Integración §8.2 en verde para vídeo, incluida la cancelación sin fugas de `VideoFrame`.
- [ ] Cada conversión verificada por contenedor (bytes mágicos) **y** por duración (±1 frame).
- [ ] El preset por defecto de «Web ligero» produce **VP9+Opus en WebM** (pila libre de regalías).
- [ ] Cada preset produce un fichero dentro del ±15 % de su bitrate objetivo.
- [ ] Vídeo→GIF de 5 s produce un GIF válido y reproducible; GIF→MP4 pesa una fracción del original
      (medirlo y dejarlo escrito).
- [ ] Un fichero de 500 MB no agota la memoria: se procesa en streaming, con el techo de 8 frames
      en vuelo verificado.

---

### Hito 6 — Interfaz de vídeo

Línea de tiempo con previsualización de fotogramas, asas de trim, selector de encuadre y proporción,
selector de presets, modo avanzado, progreso con estimación, cancelación.

**Criterios de aceptación**
- [ ] E2E §8.3 recorrido 6 en verde en `chromium`, y en `firefox` para VP9/Opus.
- [ ] `test.skip` razonado y documentado donde el navegador no soporta el códec.
- [ ] Línea de tiempo usable por teclado (flechas mueven las asas frame a frame).
- [ ] Revisión visual en los cuatro anchos, claro y oscuro.

---

### Hito 7 — PWA, offline y rendimiento

Service worker escrito a mano con manifiesto de precacheo generado en build. App shell precacheada;
códecs WASM en cache-first; **jamás se cachea un fichero de usuario**. `manifest.webmanifest`,
iconos, `theme-color` por esquema. Presupuestos de bundle activados en CI. Lighthouse CI.

**Criterios de aceptación**
- [ ] E2E nº 10 (offline) en verde.
- [ ] `size-limit` dentro de todos los límites del §8.6.
- [ ] Lighthouse CI cumpliendo todos los umbrales del §8.6 en las cuatro rutas.
- [ ] Instalable como PWA, verificado a mano en Chrome de escritorio y en un móvil real.
- [ ] Auditoría del contenido de las cachés: no aparece ningún blob de usuario (test explícito).

---

### Hito 8 — Legal, accesibilidad y páginas de contenido

Aviso legal conforme a la LSSI-CE, política de privacidad RGPD con el argumento fuerte («no hay
tratamiento de ficheros: no hay encargado del tratamiento, ni retención, ni transferencias
internacionales»), política de cookies que **declara que no se usan cookies ni analítica y explica
por qué no hay banner**, términos de uso con exención de responsabilidad, y `/licencias` con los
avisos de terceros y los enlaces al código fuente de las dependencias MPL-2.0. Todas enlazadas desde
el pie. Auditoría WCAG 2.2 AA completa.

**Criterios de aceptación**
- [ ] Las cinco páginas escritas con contenido real, adaptado a España/UE, **no relleno**.
- [ ] `/licencias` generada a partir de `THIRD_PARTY_NOTICES.md`, sin duplicar el contenido a mano.
- [ ] axe-core: cero violaciones `serious`/`critical` en todas las rutas, claro y oscuro.
- [ ] Lighthouse Accessibility = 100 en todas las rutas.
- [ ] `robots.txt` y `sitemap.xml`; staging desindexado.
- [ ] Revisión manual de contraste de los estados de foco y de los textos sobre superficies translúcidas.

---

### Hito 9 — Matriz E2E completa y cross-browser

Todos los recorridos del §8.3 en los cinco proyectos de Playwright, con los `skip` razonados.
Casos límite completos. Test de privacidad. Test de presupuesto de carga diferida.

**Criterios de aceptación**
- [ ] La matriz del §8 **entera** ejecutada y en verde, sin `.only`, sin `.skip` sin motivo escrito.
- [ ] Lista de `skip` con su motivo recogida en `PROGRESS.md` y en el README como limitaciones conocidas.
- [ ] Reporte de Playwright subido como artefacto de CI.
- [ ] `security-review` ejecutada sobre el diff acumulado.

---

### Hito 10 — Cierre

`docs/MANUAL_QA.md` con el guion de verificación manual paso a paso y casillas, para móvil real y
escritorio, incluyendo lo que Playwright no puede cubrir (Safari real con WebCodecs, HEIC en un
iPhone, instalación de la PWA, gestos táctiles del recorte, lector de pantalla con VoiceOver).
README con capturas reales, formatos soportados y limitaciones conocidas. CHANGELOG. PR de
`staging` a `main`.

**Criterios de aceptación**
- [ ] Toda la matriz de pruebas en verde.
- [ ] Despliegue de staging funcionando y verificado a mano.
- [ ] Guion manual entregado.
- [ ] `PROGRESS.md` con el estado final de los once hitos, las decisiones tomadas y lo que queda
      pendiente para v1.1 (PDF, más presets, i18n).

---

## 11. Riesgos conocidos y cómo se afrontan

| Riesgo | Mitigación |
|---|---|
| **WebKit de Playwright no expone WebCodecs** → el vídeo no se puede probar automáticamente en Safari. | `skip` razonado + cobertura obligatoria en el guion manual sobre Safari real. Declarado en README y PROGRESS. |
| **Safari < 26 tiene WebCodecs parcial.** | Detección de capacidades por configuración concreta (`isConfigSupported`), no por presencia de la API. Degradación a WebM/VP9 o mensaje claro. |
| **JPEG XL no se ve en el 85 % de los navegadores.** | Se ofrece como salida con aviso explícito en la UI. Verificación por bytes, no por render. |
| **HEIC sólo se lee en Apple.** | ADR-0005. Mensaje concreto que dice qué hacer (convertir en el propio iPhone). Sin libheif. |
| **COEP `require-corp` puede romper algo inesperado.** | Se activa en el Hito 0, no al final, para que cualquier incompatibilidad aparezca pronto. Test E2E que afirma `crossOriginIsolated`. |
| **Vídeos grandes agotan la memoria en móvil.** | Streaming frame a frame, techo de frames en vuelo, y aviso honesto por adelantado según `deviceMemory` y la resolución del fichero. |
| **`output: 'export'` limita Next** (sin middleware, sin rutas de API, sin optimización de imágenes). | Ninguna de las tres se necesita. Las cabeceras van en `vercel.json`, que funciona igual con salida estática. |
| **El plan Hobby de Vercel es para uso no comercial.** | Señalado al usuario. Si se monetiza, plan Pro. |
| **Deriva del diseño hacia la plantilla genérica.** | §7 con prohibiciones concretas + pasada de crítica obligatoria de `frontend-design` + revisión con capturas en cada hito de UI. |

---

## 12. Comandos que requieren credenciales

`gh` está autenticado como `alejandroo188` (scopes `admin:public_key, gist, read:org, repo`) y
`vercel` como `alejandroo188`. **El ejecutor no necesita nada del usuario para arrancar.**

Sólo estas dos cosas son del usuario:

```bash
# 1. Sólo si algún comando de la API de GitHub falla por falta del scope 'workflow':
gh auth refresh -h github.com -s workflow

# 2. Sólo si se decide comprar el dominio (opcional; hoy tolva.dev figura libre):
#    comprarlo en el registrador y después:
vercel domains add tolva.dev
vercel alias set <deployment-de-produccion> tolva.dev
```

---

## 13. Fuera de alcance de la v1 (escrito para que no haya deriva)

PDF (imágenes→PDF y PDF→imágenes) · internacionalización más allá del español · cuentas de usuario ·
almacenamiento en la nube · edición por capas · IA (quitar fondo, ampliar) · analítica de cualquier
tipo · RAW · PSD.

---

*Plan cerrado. Cualquier desviación se documenta en `PROGRESS.md` con su motivo.*
