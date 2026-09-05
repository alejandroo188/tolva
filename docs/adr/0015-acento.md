# ADR-0015 — Acento cian de mesa de luz

## Contexto

El §7 del plan pide «un único acento vivo» y deja dos candidatos: cian `oklch(0.62 0.14 210)` e
índigo `oklch(0.52 0.20 275)`. Hay que elegir uno y que la elección tenga motivo, no que sea la
del color que un diseñador usaría por defecto en cualquier producto SaaS.

## Opciones

1. **Cian** `oklch(0.62 0.14 210)`.
2. **Índigo** `oklch(0.52 0.20 275)`.

## Decisión

**Opción 1 — cian de mesa de luz.**

## Justificación

- **Instrumental, atado al tema.** La mesa de luz es el mueble donde fotógrafos y retocadores
  inspeccionan película y diapositivas a contraluz: juzgar píxeles, que es exactamente la tarea de
  Tolva. El cian es el color del contraluz frío; el índigo no tiene ningún vínculo con el oficio.
- **El índigo es el acento "producto" por defecto.** Stripe, Linear y mil dashboards usan un
  índigo saturado sobre blanco. Sobre una base blanca y un gris frío, un índigo habría leído como
  «otro SaaS más». El cian nos separa del montón.
- **No colisiona con los semánticos.** Cian deja verde libre para «éxito» y rojo para «error» sin
  que el ojo confunda los canales. Un índigo saturado se acerca perceptualmente al azul de Apple
  (`#007AFF`, prohibido en el §7.4) más de lo que lo hace el cian elegido.
- **Funciona en claro y en oscuro.** En claro vive en `oklch(0.62 0.14 210)`; en oscuro se sube a
  `oklch(0.72 0.13 210)` para conservar la misma viveza sin reventar contraste sobre fondo oscuro.

## Consecuencias

- El acento se usa **con disciplina**: foco, selección, `switch` encendido, `segmented` activo, la
  flecha «→» de la cifra y el relleno de la barra que encoge. No se gasta en rellenar cada botón.
- El botón primario es casi negro con texto blanco; así el cian conserva su rareza en lugar de
  diluirse por toda la interfaz.
- Cualquier color nuevo debe pasar por el mismo filtro: ¿está atado al oficio o es decoración?
