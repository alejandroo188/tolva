/**
 * Detección de capacidades del entorno con globals **inyectables** (§8.1).
 *
 * Cada escenario degradado produce un mensaje concreto en `degradations`; la
 * función nunca lanza, por construcción (nulos controlados y try/catch en las
 * comprobaciones asíncronas). Así se puede probar en Node mockeando los globals.
 */

/** Lo que devuelve el codificador de imagen al pedir un tipo MIME. */
export interface EncodedImageLike {
  type: string;
}

/**
 * Los globals que el detector necesita, inyectados (nunca se leen de
 * `window`/`globalThis` directamente aquí). En producción, el punto de entrada
 * los captura del navegador; en tests, se mockean.
 */
export interface DetectionGlobals {
  OffscreenCanvas?: unknown;
  VideoEncoder?: unknown;
  VideoDecoder?: unknown;
  AudioEncoder?: unknown;
  AudioDecoder?: unknown;
  VideoFrame?: unknown;
  ImageDecoder?: unknown;
  SharedArrayBuffer?: unknown;
  WebAssembly?: unknown;
  WebGLRenderingContext?: unknown;
  WebGL2RenderingContext?: unknown;
  /** `VideoEncoder.isConfigSupported`, inyectado para poder mockearlo. */
  isConfigSupported?: (config: { codec: string }) => Promise<boolean> | boolean;
  /** `canvas.toBlob`/`convertToBlob`, inyectado (devuelve el tipo real del blob). */
  encodeImage?: (type: string) => Promise<EncodedImageLike | null> | EncodedImageLike | null;
  hardwareConcurrency?: number;
}

/** Una degradación detectada: qué falta y cómo se compensa. */
export interface Degradation {
  feature: string;
  message: string;
}

/** Capacidades detectadas, agrupadas por dominio. */
export interface Capabilities {
  image: {
    offscreenCanvas: boolean;
    webgl: boolean;
    webgl2: boolean;
    imageDecoder: boolean;
    /** `true` si pedir `image/webp` devuelve un blob de tipo `image/webp`. */
    webpEncode: boolean;
  };
  video: {
    webCodecs: boolean;
    videoEncoder: boolean;
    videoDecoder: boolean;
    audioEncoder: boolean;
    audioDecoder: boolean;
    /** Códecs de vídeo con `isConfigSupported === true`. */
    codecs: string[];
  };
  sharedArrayBuffer: boolean;
  wasm: boolean;
  hardwareConcurrency: number;
  degradations: Degradation[];
}

/** Códecs de vídeo que se sondean si `VideoEncoder` está presente. */
const PROBED_CODECS = ["av01.0.04M.08", "vp09.00.10.08", "avc1.42E01E"] as const;

/**
 * Detecta las capacidades a partir de los globals inyectados. **Nunca lanza.**
 */
export async function detectCapabilities(globals: DetectionGlobals = {}): Promise<Capabilities> {
  const degradations: Degradation[] = [];

  const offscreenCanvas = globals.OffscreenCanvas != null;
  const webgl = globals.WebGLRenderingContext != null;
  const webgl2 = globals.WebGL2RenderingContext != null;
  const imageDecoder = globals.ImageDecoder != null;
  const videoEncoder = globals.VideoEncoder != null;
  const videoDecoder = globals.VideoDecoder != null;
  const audioEncoder = globals.AudioEncoder != null;
  const audioDecoder = globals.AudioDecoder != null;
  const sharedArrayBuffer = globals.SharedArrayBuffer != null;
  const wasm = globals.WebAssembly != null;

  if (!offscreenCanvas) {
    degradations.push({
      feature: "offscreenCanvas",
      message:
        "Sin OffscreenCanvas: el procesado de imagen se hará en el hilo principal (más lento en lotes).",
    });
  }
  if (!webgl) {
    degradations.push({
      feature: "webgl",
      message: "Sin WebGL: los filtros avanzados no estarán disponibles.",
    });
  }
  if (!videoEncoder || !videoDecoder) {
    degradations.push({
      feature: "webCodecs",
      message: "Sin WebCodecs: la edición de vídeo no está disponible en este navegador.",
    });
  }
  if (!audioEncoder) {
    degradations.push({
      feature: "audioEncoder",
      message: "Sin AudioEncoder: no se podrá recodificar la pista de audio.",
    });
  }
  if (!audioDecoder) {
    degradations.push({
      feature: "audioDecoder",
      message: "Sin AudioDecoder: no se podrá decodificar la pista de audio.",
    });
  }
  if (!sharedArrayBuffer) {
    degradations.push({
      feature: "sharedArrayBuffer",
      message:
        "SharedArrayBuffer no disponible: los builds multihilo de WASM quedarán desactivados.",
    });
  }
  if (!wasm) {
    degradations.push({
      feature: "wasm",
      message: "Sin WebAssembly: los códecs WASM (AVIF/WebP/JXL) no estarán disponibles.",
    });
  }

  // Códecs de vídeo soportados vía isConfigSupported (asíncrono, nunca lanza).
  const codecs: string[] = [];
  if (videoEncoder && typeof globals.isConfigSupported === "function") {
    for (const codec of PROBED_CODECS) {
      try {
        if (await globals.isConfigSupported({ codec })) codecs.push(codec);
      } catch {
        // Se ignora: una comprobación que falla no debe romper la detección.
      }
    }
    if (codecs.length === 0) {
      degradations.push({
        feature: "videoCodec",
        message:
          "Ningún códec de vídeo soportado (isConfigSupported devolvió false): la codificación de vídeo quedará deshabilitada.",
      });
    }
  }

  // Honestidad del codificador de imagen: ¿pedir WebP devuelve WebP de verdad?
  let webpEncode = false;
  if (typeof globals.encodeImage === "function") {
    try {
      const blob = await globals.encodeImage("image/webp");
      webpEncode = blob != null && blob.type === "image/webp";
      if (!webpEncode) {
        const got = blob != null && typeof blob.type === "string" ? blob.type : "nada";
        degradations.push({
          feature: "webpEncode",
          message: `El navegador devolvió "${got}" al pedir image/webp: la salida WebP no es fiable y se usará PNG.`,
        });
      }
    } catch {
      degradations.push({
        feature: "webpEncode",
        message: "No se pudo comprobar la codificación WebP: se usará PNG como salida fiable.",
      });
    }
  }

  const hardwareConcurrency =
    typeof globals.hardwareConcurrency === "number" && globals.hardwareConcurrency > 0
      ? Math.floor(globals.hardwareConcurrency)
      : 1;

  return {
    image: { offscreenCanvas, webgl, webgl2, imageDecoder, webpEncode },
    video: {
      webCodecs: videoEncoder && videoDecoder,
      videoEncoder,
      videoDecoder,
      audioEncoder,
      audioDecoder,
      codecs,
    },
    sharedArrayBuffer,
    wasm,
    hardwareConcurrency,
    degradations,
  };
}
