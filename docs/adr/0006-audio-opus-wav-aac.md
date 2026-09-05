# ADR-0006 — Audio: Opus/WAV/AAC; sin MP3 en v1

## Contexto

La extracción y exportación de audio necesita elegir formatos. El candidato obvio, MP3, tiene un
problema de licencia en el codificador libre más usado.

## Opciones

1. MP3 vía LAME.
2. Opus (libre de regalías) + WAV (sin compresión) + AAC (por el sistema).

## Decisión

**Opción 2.** No hay MP3 en la v1.

## Consecuencias

- El codificador MP3 de referencia (LAME) es **LGPL**. Queda descartado.
- Opus es libre de regalías y excelente a bitrates bajos; WAV es trivial y sin pérdida; AAC se
  codifica por el sistema del usuario donde esté disponible.
- El MP3 es un formato de legado: su ausencia se documenta y se ofrece Opus/WAV/AAC como sustitutos.
