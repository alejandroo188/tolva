# ADR-0003 — WebCodecs + Mediabunny en lugar de ffmpeg.wasm

## Contexto

La capa de vídeo necesita demuxing, decodificación, operaciones por frame, codificación y muxing.
ffmpeg.wasm es la opción más conocida pero tiene un problema de licencia serio.

## Opciones

1. ffmpeg.wasm (`@ffmpeg/core`).
2. WebCodecs (nativo) + Mediabunny para el muxing/demuxing.

## Decisión

**Opción 2.**

## Consecuencias

- `@ffmpeg/core` declara **GPL-2.0-or-later** y su build habitual usa `--enable-gpl` y
  `--enable-nonfree`: arrastra toda la obra a GPL. Incompatible con una app MIT distribuida como
  bundle. Queda descartado.
- Mediabunny es TypeScript puro, **cero dependencias**, MPL-2.0 (copyleft por fichero, no viral),
  y cubre MP4, MOV, WebM, MKV, MP3, WAV, OGG, AAC/ADTS, FLAC, MPEG-TS y 25+ códecs.
- WebCodecs aporta la aceleración por hardware para decodificar/codificar.
- La codificación H.264/HEVC la hace el navegador/sistema del usuario, no distribuimos el códec.
