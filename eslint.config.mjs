import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next ya registra eslint-plugin-jsx-a11y (lo incluye como
// dependencia), así que las reglas de accesibilidad quedan activas vía
// core-web-vitals/typescript sin re-registrar el plugin aquí.

/**
 * APIs del navegador (y de plataforma web) que el dominio puro no debe usar.
 * `no-restricted-globals` señala la referencia por nombre, también en
 * `window.foo` / `globalThis.document`. Verificado con una prueba negativa en
 * el Hito 1 (añadir una API y comprobar que `eslint` falla).
 */
const browserGlobals = [
  "window",
  "document",
  "navigator",
  "location",
  "history",
  "screen",
  "self",
  "globalThis",
  "alert",
  "confirm",
  "prompt",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "Image",
  "ImageBitmap",
  "ImageData",
  "ImageDecoder",
  "createImageBitmap",
  "OffscreenCanvas",
  "HTMLCanvasElement",
  "HTMLImageElement",
  "HTMLVideoElement",
  "HTMLMediaElement",
  "CanvasRenderingContext2D",
  "OffscreenCanvasRenderingContext2D",
  "ImageBitmapRenderingContext",
  "Path2D",
  "WebGLRenderingContext",
  "WebGL2RenderingContext",
  "VideoFrame",
  "VideoEncoder",
  "VideoDecoder",
  "AudioEncoder",
  "AudioDecoder",
  "AudioContext",
  "AudioBuffer",
  "MediaRecorder",
  "MediaSource",
  "MediaStream",
  "File",
  "FileReader",
  "FileList",
  "Blob",
  "FormData",
  "Headers",
  "Request",
  "Response",
  "DOMException",
  "Event",
  "EventTarget",
  "CustomEvent",
  "MutationObserver",
  "ResizeObserver",
  "Worker",
  "SharedWorker",
  "ServiceWorker",
  "ServiceWorkerContainer",
  "BroadcastChannel",
  "MessageChannel",
  "MessagePort",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "requestIdleCallback",
  "cancelIdleCallback",
];

const noBrowserInDomain = {
  name: "tolva/domain-sin-browser",
  files: ["src/lib/domain/**/*.ts"],
  rules: {
    "no-restricted-globals": ["error", ...browserGlobals],
    "no-restricted-syntax": [
      "error",
      {
        selector: "MemberExpression[object.type='Identifier'][object.name='globalThis']",
        message: "El dominio debe ser puro: no accedas a `globalThis` en src/lib/domain/.",
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  noBrowserInDomain,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    "tests/fixtures/**",
  ]),
]);

export default eslintConfig;
