/**
 * Declaraciones de tipos para las dependencias que no publican `.d.ts`.
 *
 * - `utif2` es CJS (`module.exports = UTIF`) y no trae tipos.
 * - `gifenc` publica un build ESM con exports con nombre y default, pero sin
 *   fichero de tipos.
 *
 * Estos módulos se usan en el worker de imagen y en los generadores de fixtures;
 * la forma exacta se ha verificado contra sus fuentes.
 */

declare module "utif2" {
  /** Un IFD/imagen devuelto por `UTIF.decode`. Sus campos se rellenan a demanda. */
  interface UtifImage {
    width: number;
    height: number;
    data?: Uint8Array;
    [key: string]: unknown;
  }

  interface Utif {
    /** Parsea el contenedor TIFF y devuelve la lista de IFDs. */
    decode(
      buff: ArrayBuffer | Uint8Array,
      prm?: { parseMN?: boolean; debug?: boolean },
    ): UtifImage[];
    /** Descomprime los píxeles de `img` (mutándola). */
    decodeImage(buff: ArrayBuffer | Uint8Array, img: UtifImage, ifds: UtifImage[]): void;
    /** Convierte la imagen a RGBA8. Devuelve un `Uint8Array` de `width*height*4`. */
    toRGBA8(img: UtifImage, scl?: number): Uint8Array;
  }

  const UTIF: Utif;
  export default UTIF;
}

declare module "gifenc" {
  /** Instancia de codificador GIF devuelta por `GIFEncoder`. */
  interface GifEncoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: {
        palette?: number[][];
        delay?: number;
        transparent?: boolean;
        transparentIndex?: number;
        repeat?: number;
        dispose?: number;
        first?: boolean;
      },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    reset(): void;
  }

  function GIFEncoder(opt?: { initialCapacity?: number; auto?: boolean }): GifEncoder;
  /** Cuantiza RGBA a una paleta de como mucho `maxColors` colores `[r,g,b]`. */
  function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    opts?: unknown,
  ): number[][];
  /** Mapea RGBA a índices de la paleta (un `Uint8Array` por píxel). */
  function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    format?: string,
  ): Uint8Array;

  export { GIFEncoder, quantize, applyPalette };
  const _default: {
    GIFEncoder: typeof GIFEncoder;
    quantize: typeof quantize;
    applyPalette: typeof applyPalette;
  };
  export default _default;
}
