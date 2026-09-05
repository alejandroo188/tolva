# Tolva

**Conversión y edición de imágenes y vídeo, 100 % en el navegador.**

Tolva es una aplicación web que convierte, comprime y edita imágenes y vídeo sin
subir nada a ningún servidor. Todo el procesado ocurre en el dispositivo del
usuario: decodificación, transformaciones y codificación se ejecutan en
Web Workers con WebCodecs, WebAssembly y canvas.

> La promesa de privacidad no es una política, es una propiedad estructural:
> la aplicación se compila a una exportación estática (`output: 'export'`) y
> **no existe ningún endpoint al que subir un fichero**.

## Por qué existe

- **Squoosh** demuestra que el cliente basta, pero se queda en una sola imagen y
  sin vídeo.
- **Los conversores de servidor** (TinyPNG, iLoveIMG, CloudConvert) tienen el
  alcance pero imponen límites de tamaño y cantidad, porque cada fichero les
  cuesta dinero.
- **Tolva** hace lote y vídeo **sin límite de tamaño**: el coste marginal de un
  fichero es cero, porque el fichero nunca sale del navegador.

## Funcionalidad

- **Imagen**: conversión entre JPEG, PNG, WebP, AVIF, JPEG XL, GIF, BMP y TIFF;
  recorte (libre, con proporciones y presets de redes), redimensionado (Lanczos),
  rotación y volteos, ajustes (brillo, contraste, saturación, temperatura, escala
  de grises), marca de agua, comparador antes/después y lote en ZIP.
- **Vídeo**: conversión y recodificación (MP4, WebM, MOV, MKV, GIF), presets con
  nombre, trim con precisión de frame, recorte de encuadre y cambio de proporción,
  vídeo ↔ GIF, extracción de audio y de fotogramas, silenciar pista, cambio de
  velocidad.
- **Privacidad por construcción**: sin backend, CSP estricta, aislamiento de
  origen (COOP/COEP), y un test E2E que verifica que durante una conversión no
  sale ni una sola petición del dispositivo.

## Stack

Next.js 16 (export estático) · React 19 · TypeScript (strict) · Tailwind CSS v4 ·
Zustand · Comlink (workers) · [Mediabunny](https://github.com/Vanilagy/mediabunny)
(vídeo, MPL-2.0) · [jSquash](https://github.com/jamsinclair/jSquash) (códecs WASM,
Apache-2.0) · Vitest · Playwright.

Ver `docs/RESEARCH.md` para la investigación previa y `docs/LEGAL_DECISIONS.md`
para las decisiones legales y de licencias.

## Empezar

Requisitos: Node 22+ (LTS) y npm.

```bash
npm ci          # instala dependencias (se verifica su licencia con la skill licencias-permisivas)
npm run dev     # arranca en http://localhost:3000
npm run build   # build estático en out/
```

### Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build estático (`out/`) |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm run test:unit` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests E2E (Playwright) |
| `npm run licenses:check` | Guardián de licencias (falla ante GPL/AGPL/LGPL/etc.) |
| `npm run notices:generate` / `notices:check` | Avisos de terceros |
| `npm run size` | Presupuesto de bundle |

## Licencia

MIT. Ver `LICENSE`. Los avisos y licencias de las dependencias de terceros están
en `THIRD_PARTY_NOTICES.md` y en la página `/licencias` de la propia aplicación.
