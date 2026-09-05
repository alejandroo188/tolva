# Arquitectura

## 1. Principio y su garantía técnica

Todo el procesado ocurre en el dispositivo. Eso no se sostiene con una promesa en la política de
privacidad, sino con **tres capas de garantía**, en orden de fuerza:

1. **Estructural** — `output: 'export'`. No hay funciones serverless, no hay rutas de API, no hay
   backend. No existe destino al que subir nada.
2. **Impuesta por el navegador** — cabecera CSP con `connect-src 'self'` y `form-action 'none'`.
   Aunque alguien introdujera código de subida, el navegador lo bloquearía.
3. **Verificada en CI** — un test E2E intercepta todo el tráfico de red durante una conversión
   completa y falla si aparece cualquier petición que no sea a un asset estático del propio origen.

## 2. Flujo de datos

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

## 3. Modelo de edición no destructivo

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
que hace que la matriz de tests unitarios sea real y no decorativa.

## 4. Orquestación de workers

- **Comlink** (Apache-2.0) para el RPC. Progreso vía `Comlink.proxy(callback)`.
- **Pool de imagen:** `clamp(navigator.hardwareConcurrency - 1, 2, 6)` workers. Cada trabajo es
  independiente; la cola reparte por round-robin y reintenta una vez ante fallo transitorio.
- **Vídeo: un solo worker.** Los codificadores de WebCodecs ya usan el hardware; paralelizar
  trabajos de vídeo compite por el mismo encoder y empeora el resultado. La cola de vídeo es FIFO
  estricta.
- **Cancelación:** cada trabajo recibe un `AbortSignal`; el worker comprueba `signal.aborted` entre
  frames y en cada iteración del bucle de codificación, cierra el encoder con `close()` y libera
  `VideoFrame`/`ImageBitmap`. Un trabajo cancelado debe dejar memoria en el mismo nivel que antes de
  empezar.
- **Presión de memoria:** el vídeo se procesa en streaming frame a frame; nunca se materializa el
  fichero completo descodificado. Límite duro: si `frames en vuelo > 8`, el productor espera.

## 5. Aislamiento de origen

Se activan `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Embedder-Policy: require-corp`.
Coste: no podríamos incrustar recursos de terceros — y no incrustamos ninguno. Beneficio:
`crossOriginIsolated === true`, luego `SharedArrayBuffer`, luego builds multihilo de WASM donde
jSquash los publique. Ver ADR-0010.

## 6. Mapa de directorios

Ver el árbol completo en `PLAN.md` §6. Lo esencial:

- `src/lib/domain/` — 100 % puro, testeable en Node (receta, geometría, proporciones, recorte,
  redimensionado, nombres, bytes, calidad).
- `src/lib/capabilities/` — detección de capacidades con globals inyectables (testeable).
- `src/lib/codecs/` — cargadores dinámicos con `import()` perezoso (nada de `.wasm` hasta que se pide).
- `src/lib/media/` — `image-pipeline.ts` y `video-pipeline.ts`, los orquestadores.
- `src/lib/workers/` — `image.worker.ts`, `video.worker.ts`, `pool.ts`.
- `src/lib/store/` — `queue.ts`, `editor.ts`, `prefs.ts` (Zustand).
- `src/config/` — `social-presets.json` y `video-presets.json`, editables sin tocar código.
