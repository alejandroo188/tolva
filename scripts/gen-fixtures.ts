#!/usr/bin/env node
/**
 * Genera los fixtures de test (§8.5). Los fixtures son sintéticos y propios
 * (MIT), generados sin ffmpeg:
 * - Imágenes de canvas en Chromium vía Playwright (degradados, tablero con
 *   alfa, carta de color, ruido, 4000×3000, base JPEG).
 * - Binarios en Node: BMP, TIFF (RGB sin comprimir), GIF animado (gifenc) y
 *   JPEG con EXIF (orientación 6 + GPS) inyectado sobre un JPEG de canvas.
 * - Casos límite: JPEG truncado y fichero de 0 bytes.
 *
 * Los vídeos (Mediabunny) llegan en el Hito 5.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

const FIXTURES = resolve(process.cwd(), "tests", "fixtures");
const IMAGES = join(FIXTURES, "images");
const VIDEO = join(FIXTURES, "video");

const README = `# Fixtures de test

Todos los fixtures son **sintéticos y generados por nosotros** con
\`npm run fixtures:generate\`, por lo que su licencia es trivial: **MIT, nuestra**.

- Imágenes: degradados deterministas, patrón de tablero con canal alfa, carta de
  color, foto sintética con ruido, 4000×3000, JPEG con EXIF (GPS + orientación 6),
  GIF animado de 10 frames, TIFF, BMP, SVG, JPEG truncado, fichero de 0 bytes.
- Vídeo: generados con Mediabunny (WebM VP9+Opus, MP4 H.264+AAC, sin audio,
  sólo audio) en el Hito 5.

Cada fichero queda documentado en \`LICENSES.md\`. No se admite material externo
salvo dominio público o licencia libre verificada y anotada.
`;

const LICENSES = `# Licencias de los fixtures

Todo el material de esta carpeta es obra propia generada por
\`scripts/gen-fixtures.ts\` y se distribuye bajo **MIT** (© 2026, proyecto Tolva).

Si en el futuro se añade material externo, sólo se admite dominio público o
licencia libre verificada y anotada (p. ej. Big Buck Bunny, CC-BY 3.0, Blender
Foundation), con la atribución exacta en este fichero.
`;

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
  <rect width="320" height="180" fill="#123a5c"/>
  <circle cx="90" cy="90" r="48" fill="#e0b34a"/>
  <path d="M160 150 L240 30 L300 150 Z" fill="#2f8f6b"/>
  <text x="20" y="30" font-family="system-ui" font-size="24" fill="#ffffff">Tolva</text>
</svg>
`;

// ── utilidades de bytes (LE) ────────────────────────────────────────────────
function u16(n: number): number[] {
  return [n & 0xff, (n >>> 8) & 0xff];
}
// El campo de longitud de un segmento JPEG es siempre big-endian (Motorola),
// con independencia del byte order del TIFF que lleve dentro.
function u16be(n: number): number[] {
  return [(n >>> 8) & 0xff, n & 0xff];
}
function u32(n: number): number[] {
  return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
}
function str(s: string): number[] {
  return Array.from(Buffer.from(s, "latin1"));
}
function buf(...parts: Array<number[] | Uint8Array>): Buffer {
  return Buffer.concat(parts.map((p) => Buffer.from(p)));
}

// ── BMP (24 bpp, sin comprimir, bottom-up) ──────────────────────────────────
function writeBmp(path: string, rgba: Uint8Array, width: number, height: number): void {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const dataOffset = 54;
  const pixelSize = rowSize * height;
  const out = Buffer.alloc(dataOffset + pixelSize);
  out[0] = 0x42;
  out[1] = 0x4d;
  out.writeUInt32LE(out.length, 2);
  out.writeUInt32LE(dataOffset, 10);
  out.writeUInt32LE(40, 14);
  out.writeInt32LE(width, 18);
  out.writeInt32LE(height, 22);
  out.writeUInt16LE(1, 26);
  out.writeUInt16LE(24, 28);
  out.writeUInt32LE(pixelSize, 34);
  for (let y = 0; y < height; y += 1) {
    const srcRow = (height - 1 - y) * width * 4;
    const dstRow = dataOffset + y * rowSize;
    for (let x = 0; x < width; x += 1) {
      const s = srcRow + x * 4;
      const d = dstRow + x * 3;
      out[d] = rgba[s + 2];
      out[d + 1] = rgba[s + 1];
      out[d + 2] = rgba[s];
    }
  }
  writeFileSync(path, out);
}

// ── TIFF (RGB sin comprimir, little-endian) ─────────────────────────────────
function writeTiff(path: string, rgba: Uint8Array, width: number, height: number): void {
  const pixelBytes = width * height * 3;
  // Orden de entradas: ordenadas por tag (obligatorio en TIFF).
  const entries = 9;
  const ifdOffset = 8;
  const ifdSize = 2 + entries * 12 + 4;
  const bpsOffset = ifdOffset + ifdSize; // 3 shorts
  const dataOffset = bpsOffset + 6; // píxeles
  const dataEnd = dataOffset + pixelBytes;

  const parts: number[][] = [];
  parts.push([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]); // cabecera
  parts.push(u16(entries));
  const entry = (tag: number, type: number, count: number, value: number): number[] => [
    ...u16(tag),
    ...u16(type),
    ...u32(count),
    ...u32(value),
  ];
  // 256 ImageWidth (LONG)
  parts.push(entry(256, 4, 1, width));
  // 257 ImageLength (LONG)
  parts.push(entry(257, 4, 1, height));
  // 258 BitsPerSample (SHORT ×3 → offset)
  parts.push(entry(258, 3, 3, bpsOffset));
  // 259 Compression (SHORT = 1)
  parts.push(entry(259, 3, 1, 1));
  // 262 PhotometricInterpretation (SHORT = 2 RGB)
  parts.push(entry(262, 3, 1, 2));
  // 273 StripOffsets (LONG)
  parts.push(entry(273, 4, 1, dataOffset));
  // 277 SamplesPerPixel (SHORT = 3)
  parts.push(entry(277, 3, 1, 3));
  // 278 RowsPerStrip (LONG)
  parts.push(entry(278, 4, 1, height));
  // 279 StripByteCounts (LONG)
  parts.push(entry(279, 4, 1, pixelBytes));
  parts.push(u32(0)); // siguiente IFD
  parts.push([...u16(8), ...u16(8), ...u16(8)]); // BitsPerSample

  const pixel = Buffer.alloc(pixelBytes);
  for (let i = 0; i < width * height; i += 1) {
    pixel[i * 3] = rgba[i * 4];
    pixel[i * 3 + 1] = rgba[i * 4 + 1];
    pixel[i * 3 + 2] = rgba[i * 4 + 2];
  }

  const tiff = Buffer.concat([buf(...parts), pixel]);
  if (tiff.length !== dataEnd) throw new Error("TIFF: offsets mal calculados");
  writeFileSync(path, tiff);
}

// ── EXIF APP1 (orientación 6 + GPS) ─────────────────────────────────────────
function buildExifApp1(): Buffer {
  // Estructura TIFF LE: IFD0 → ExifIFD → GPSIFD, con datos racionales al final.
  const parts: number[][] = [];
  parts.push([0xff, 0xe1]); // marcador APP1
  // "length" se rellena después (marcador de posición).
  parts.push([0x00, 0x00]);
  parts.push(str("Exif\0\0")); // 6 bytes

  const tiffStart = 8; // offset 0 dentro del payload TIFF (tras los 6 de "Exif\0\0")
  const header = [0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]; // "II*\0" + offset IFD0 = 8

  // IFD0 (offset 8): 2 entradas (Orientation, ExifIFDPointer)
  const ifd0Offset = 8;
  const ifd0Count = 2;
  const ifd0Size = 2 + ifd0Count * 12 + 4;
  const exifIfdOffset = ifd0Offset + ifd0Size;

  // ExifIFD: 1 entrada (GPSInfoIFDPointer)
  const exifIfdCount = 1;
  const exifIfdSize = 2 + exifIfdCount * 12 + 4;
  const gpsIfdOffset = exifIfdOffset + exifIfdSize;

  // GPSIFD: 5 entradas
  const gpsIfdCount = 5;
  const gpsIfdSize = 2 + gpsIfdCount * 12 + 4;
  const gpsDataOffset = gpsIfdOffset + gpsIfdSize;

  const entry = (tag: number, type: number, count: number, value: number): number[] => [
    ...u16(tag),
    ...u16(type),
    ...u32(count),
    ...u32(value),
  ];

  const ifd0: number[][] = [];
  ifd0.push(u16(ifd0Count));
  ifd0.push(entry(0x0112, 3, 1, 6)); // Orientation = 6
  ifd0.push(entry(0x8769, 4, 1, exifIfdOffset)); // ExifIFDPointer
  ifd0.push(u32(0));

  const exifIfd: number[][] = [];
  exifIfd.push(u16(exifIfdCount));
  exifIfd.push(entry(0x8825, 4, 1, gpsIfdOffset)); // GPSInfoIFDPointer
  exifIfd.push(u32(0));

  // Latitud: 40/1, 26/1, 46/1 · Longitud: 74/1, 0/1, 36/1
  const gpsLatOffset = gpsDataOffset;
  const gpsLonOffset = gpsLatOffset + 3 * 8;
  const gpsIfd: number[][] = [];
  gpsIfd.push(u16(gpsIfdCount));
  gpsIfd.push(entry(0x0000, 1, 4, (2 << 24) | (3 << 16) | (0 << 8) | 0)); // GPSVersionID 2.3.0.0
  gpsIfd.push(entry(0x0001, 2, 2, 0x4e)); // "N\0" (inline, LE: 'N' en byte bajo)
  gpsIfd.push(entry(0x0002, 5, 3, gpsLatOffset)); // GPSLatitude
  gpsIfd.push(entry(0x0003, 2, 2, 0x57)); // "W\0" (inline, LE: 'W' en byte bajo)
  gpsIfd.push(entry(0x0004, 5, 3, gpsLonOffset)); // GPSLongitude
  gpsIfd.push(u32(0));

  const rationals: number[][] = [];
  for (const [n, d] of [
    [40, 1],
    [26, 1],
    [46, 1],
    [74, 1],
    [0, 1],
    [36, 1],
  ] as const) {
    rationals.push(u32(n), u32(d));
  }

  const tiff = buf(header, ...ifd0, ...exifIfd, ...gpsIfd, ...rationals);
  // Longitud del payload TIFF (sin contar el marcador ni el propio campo length).
  const payloadLength = 6 + tiff.length; // "Exif\0\0" + TIFF
  const length = 2 + payloadLength; // campo length + payload
  const app1 = buf([0xff, 0xe1], u16be(length), str("Exif\0\0"), tiff);
  void tiffStart;
  return app1;
}

/** Inserta el segmento APP1 justo después del SOI (FF D8). */
function injectExif(jpeg: Buffer, app1: Buffer): Buffer {
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}

// ── GIF animado (gifenc, CJS en Node) ───────────────────────────────────────
async function writeAnimatedGif(path: string): Promise<void> {
  const mod = (await import("gifenc")) as unknown as Record<string, unknown>;
  // En Node ESM `import("gifenc")` resuelve el `main` (CJS) y expone la API bajo
  // `default` (o `module.exports`); en Turbopack se usarían los exports nombrados.
  const g = (mod.default ?? mod["module.exports"] ?? mod) as {
    GIFEncoder: (opt?: { initialCapacity?: number }) => {
      writeFrame(index: Uint8Array, w: number, h: number, opts: Record<string, unknown>): void;
      finish(): void;
      bytes(): Uint8Array;
    };
    quantize: (rgba: Uint8Array, maxColors: number) => number[][];
    applyPalette: (rgba: Uint8Array, palette: number[][]) => Uint8Array;
  };

  const W = 64;
  const H = 64;
  const encoder = g.GIFEncoder({ initialCapacity: 1 << 16 });
  for (let f = 0; f < 10; f += 1) {
    const rgba = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4;
        // Fondo con degradado y un disco que se desplaza (frame → posición).
        const cx = (f * 6) % W;
        const cy = 32;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const inDisc = dist < 14;
        rgba[i] = inDisc ? 220 : Math.floor((x / W) * 255);
        rgba[i + 1] = inDisc ? 40 : Math.floor((y / H) * 255);
        rgba[i + 2] = inDisc ? 40 : 128;
        rgba[i + 3] = 255;
      }
    }
    const palette = g.quantize(rgba, 256);
    const index = g.applyPalette(rgba, palette);
    encoder.writeFrame(index, W, H, { palette, delay: 100 });
  }
  encoder.finish();
  writeFileSync(path, Buffer.from(encoder.bytes()));
}

// ── imágenes de canvas (Chromium) ───────────────────────────────────────────
async function generateCanvasImages(): Promise<{
  gradient: string;
  checkerboard: string;
  colorChart: string;
  noise: string;
  large: string;
  exifBase: string;
}> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    return await page.evaluate(() => {
      function canvas(w: number, h: number): HTMLCanvasElement {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
      }
      function ctx(c: HTMLCanvasElement): CanvasRenderingContext2D {
        return c.getContext("2d") as CanvasRenderingContext2D;
      }
      // RNG determinista (LCG) para ruido reproducible.
      function seeded(seed: number): () => number {
        let s = seed >>> 0;
        return () => {
          s = (s * 1664525 + 1013904223) >>> 0;
          return s / 0xffffffff;
        };
      }

      // 1. Degradado horizontal.
      const g1 = canvas(640, 360);
      const g1c = ctx(g1);
      const grad = g1c.createLinearGradient(0, 0, 640, 0);
      grad.addColorStop(0, "#0f2d4e");
      grad.addColorStop(0.5, "#3b8f6b");
      grad.addColorStop(1, "#e0b34a");
      g1c.fillStyle = grad;
      g1c.fillRect(0, 0, 640, 360);

      // 2. Tablero con canal alfa (celdas transparentes).
      const g2 = canvas(320, 240);
      const g2c = ctx(g2);
      const cell = 16;
      for (let y = 0; y < 240; y += cell) {
        for (let x = 0; x < 320; x += cell) {
          const even = (x / cell + y / cell) % 2 === 0;
          g2c.fillStyle = even ? "rgba(20, 40, 60, 1)" : "rgba(20, 40, 60, 0)";
          g2c.fillRect(x, y, cell, cell);
        }
      }

      // 3. Carta de color (grid de 8×8 colores).
      const g3 = canvas(256, 256);
      const g3c = ctx(g3);
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          g3c.fillStyle = `rgb(${x * 36}, ${y * 36}, ${(x + y) * 18})`;
          g3c.fillRect(x * 32, y * 32, 32, 32);
        }
      }

      // 4. Ruido determinista.
      const g4 = canvas(512, 512);
      const g4c = ctx(g4);
      const rnd = seeded(12345);
      const img4 = g4c.createImageData(512, 512);
      for (let i = 0; i < img4.data.length; i += 4) {
        const v = Math.floor(rnd() * 256);
        img4.data[i] = v;
        img4.data[i + 1] = Math.floor(rnd() * 256);
        img4.data[i + 2] = Math.floor(rnd() * 256);
        img4.data[i + 3] = 255;
      }
      g4c.putImageData(img4, 0, 0);

      // 5. Grande 4000×3000 con alta frecuencia (tablero fino + degradado).
      const g5 = canvas(4000, 3000);
      const g5c = ctx(g5);
      const grad5 = g5c.createLinearGradient(0, 0, 4000, 3000);
      grad5.addColorStop(0, "#1c3a5c");
      grad5.addColorStop(1, "#e8c76b");
      g5c.fillStyle = grad5;
      g5c.fillRect(0, 0, 4000, 3000);
      g5c.fillStyle = "#0a0a0a";
      const stripe = 4;
      for (let y = 0; y < 3000; y += stripe * 2) {
        g5c.fillRect(0, y, 4000, stripe);
      }

      // 6. Base JPEG para EXIF (800×600).
      const g6 = canvas(800, 600);
      const g6c = ctx(g6);
      g6c.fillStyle = "#7a2f45";
      g6c.fillRect(0, 0, 800, 600);
      g6c.fillStyle = "#f0e9d6";
      g6c.beginPath();
      g6c.arc(400, 300, 160, 0, Math.PI * 2);
      g6c.fill();

      return {
        gradient: g1.toDataURL("image/png"),
        checkerboard: g2.toDataURL("image/png"),
        colorChart: g3.toDataURL("image/png"),
        noise: g4.toDataURL("image/png"),
        large: g5.toDataURL("image/png"),
        exifBase: g6.toDataURL("image/jpeg", 0.92),
      };
    });
  } finally {
    await browser.close();
  }
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Buffer.from(base64, "base64");
}

async function main(): Promise<number> {
  for (const dir of [FIXTURES, IMAGES, VIDEO]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  writeFileSync(join(FIXTURES, "README.md"), README);
  writeFileSync(join(FIXTURES, "LICENSES.md"), LICENSES);
  writeFileSync(join(IMAGES, "sample.svg"), SVG);
  writeFileSync(join(IMAGES, "empty.bin"), Buffer.alloc(0));

  // Binarios en Node.
  const bmpRgba = new Uint8Array(64 * 48 * 4);
  for (let y = 0; y < 48; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      const i = (y * 64 + x) * 4;
      bmpRgba[i] = (x * 4) % 256;
      bmpRgba[i + 1] = (y * 5) % 256;
      bmpRgba[i + 2] = 200;
      bmpRgba[i + 3] = 255;
    }
  }
  writeBmp(join(IMAGES, "sample.bmp"), bmpRgba, 64, 48);

  const tiffRgba = new Uint8Array(80 * 60 * 4);
  for (let y = 0; y < 60; y += 1) {
    for (let x = 0; x < 80; x += 1) {
      const i = (y * 80 + x) * 4;
      tiffRgba[i] = 255 - ((x * 3) % 256);
      tiffRgba[i + 1] = (y * 4) % 256;
      tiffRgba[i + 2] = (x + y) % 256;
      tiffRgba[i + 3] = 255;
    }
  }
  writeTiff(join(IMAGES, "sample.tiff"), tiffRgba, 80, 60);

  await writeAnimatedGif(join(IMAGES, "animated.gif"));

  // Imágenes de canvas en Chromium + JPEG con EXIF.
  const canvasImages = await generateCanvasImages();
  writeFileSync(join(IMAGES, "gradient.png"), dataUrlToBuffer(canvasImages.gradient));
  writeFileSync(join(IMAGES, "checkerboard.png"), dataUrlToBuffer(canvasImages.checkerboard));
  writeFileSync(join(IMAGES, "color-chart.png"), dataUrlToBuffer(canvasImages.colorChart));
  writeFileSync(join(IMAGES, "noise.png"), dataUrlToBuffer(canvasImages.noise));
  writeFileSync(join(IMAGES, "large-4000x3000.png"), dataUrlToBuffer(canvasImages.large));

  const baseJpeg = dataUrlToBuffer(canvasImages.exifBase);
  const exifJpeg = injectExif(baseJpeg, buildExifApp1());
  writeFileSync(join(IMAGES, "exif.jpg"), exifJpeg);
  writeFileSync(
    join(IMAGES, "jpeg-truncated.jpg"),
    exifJpeg.subarray(0, Math.floor(exifJpeg.length / 2)),
  );

  console.log(
    "✓ Fixtures de imagen generados (canvas, BMP, TIFF, GIF animado, JPEG con EXIF).\n" +
      "  Los fixtures de vídeo (Mediabunny) llegan en el Hito 5.",
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("✗ Error generando fixtures:", err);
    process.exit(1);
  },
);
