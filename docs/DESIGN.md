# Dirección visual de Tolva — plan de diseño y crítica anti-default

Este documento es la salida del proceso de dos pasadas de la skill `frontend-design`, ejecutado
sobre el brief del §7 de `PLAN.md`. La pasada 1 fija el sistema de tokens; la pasada 2 lo revisa
contra el brief y anota qué se cambió y por qué.

## Pasada 1 — Plan

### Concepto

El héroe no es un titular: **es una cifra**. Tolva existe para producir un número («34,7 MB →
1,9 MB, −94 %») y una barra que encoge físicamente a su lado. Toda la audacia se gasta ahí; el
resto de la interfaz es chrome callado. La pantalla inicial es la zona de arrastre a pantalla
completa: no hay hero de marketing, no hay titular con una palabra en otro color, no hay tarjetas
de features. Se entiende en tres segundos porque sólo hay una cosa que hacer.

### Color

Modo claro por defecto, base blanca pura para la superficie de trabajo (donde va la imagen, para
no falsear el color que el usuario juzga) y un gris **frío** muy tenue para el chrome. Un único
acento vivo; semánticos separados para éxito/aviso/error. Modo oscuro completo desde el primer
commit.

| Token | Claro | Oscuro | Rol |
|---|---|---|---|
| `surface` | `oklch(1 0 0)` | `oklch(0.19 0.008 250)` | superficie de trabajo (blanco puro) |
| `chrome` | `oklch(0.968 0.004 240)` | `oklch(0.23 0.008 250)` | cabecera/pie, paneles |
| `surface-2` | `oklch(0.985 0.002 240)` | `oklch(0.25 0.008 250)` | distinción sutil dentro de paneles |
| `line` | `oklch(0.90 0.005 240)` | `oklch(0.30 0.008 250)` | filete / borde |
| `line-strong` | `oklch(0.84 0.006 240)` | `oklch(0.36 0.01 250)` | borde con más presencia |
| `text` | `oklch(0.23 0.01 250)` | `oklch(0.96 0.003 240)` | texto principal |
| `text-secondary` | `oklch(0.46 0.01 250)` | `oklch(0.72 0.008 250)` | texto secundario |
| `text-muted` | `oklch(0.63 0.01 250)` | `oklch(0.56 0.008 250)` | texto terciario |
| `accent` | `oklch(0.62 0.14 210)` | `oklch(0.72 0.13 210)` | **cian de mesa de luz** |
| `accent-hover` | `oklch(0.57 0.15 210)` | `oklch(0.76 0.12 210)` | hover del acento |
| `accent-active` | `oklch(0.52 0.15 210)` | `oklch(0.68 0.14 210)` | pulsado |
| `accent-subtle` | `oklch(0.62 0.14 210 / 0.12)` | `oklch(0.72 0.13 210 / 0.16)` | fondo de selección |
| `on-accent` | `oklch(0.99 0 0)` | `oklch(0.15 0.02 210)` | texto/icono sobre acento |
| `success` | `oklch(0.55 0.15 155)` | `oklch(0.72 0.15 155)` | éxito |
| `warning` | `oklch(0.60 0.13 80)` | `oklch(0.75 0.13 80)` | aviso |
| `danger` | `oklch(0.55 0.19 25)` | `oklch(0.70 0.17 25)` | error |

### Tipografía

Una sola familia (ADR-0007): stack de sistema con Inter variable autoalojada como fallback.
Nada de monoespaciada para etiquetas. La personalidad la da el **tratamiento** de la cifra, no una
segunda tipografía.

- `--font-sans`: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Inter Variable", sans-serif`.
- La cifra: `tabular-nums`, peso 600, tracking `-0.03em`, 56 px, con la unidad a 15 px / 400
  alineada a la línea base. El contraste de escala (56/600 contra 15/400) hace el trabajo que en
  otras webs hace una tipografía decorativa.

Escala (tokens, ritmo base 4 px):

| Token | Tamaño / peso / line-height | Uso |
|---|---|---|
| `display` | 56 / 600 / 1.05 | la cifra |
| `title` | 28 / 600 / 1.2 | título de página |
| `heading` | 22 / 600 / 1.25 | secciones |
| `subheading` | 17 / 600 / 1.3 | subtítulos |
| `body` | 15 / 400 / 1.5 | cuerpo |
| `small` | 13 / 400 / 1.4 | auxiliar |
| `caption` | 12 / 500 / 1.3 | etiquetas (sentence case) |

Longitud de línea < 80 caracteres en textos legales.

### Layout

```
┌──────────────────────────────────────────────┐
│ Cabecera (chrome, translúcida, blur)          │
│  [marca Tolva]              [selector de tema]│
├──────────────────────────────────────────────┤
│                                              │
│      zona de arrastre a pantalla completa    │
│      (superficie blanca pura)                │
│                                              │
│      34,7 MB → 1,9 MB        −94 %           │
│      ████████░░░░░░░░  (barra que encoge)    │
│                                              │
├──────────────────────────────────────────────┤
│ Pie (chrome, enlaces legales)                │
└──────────────────────────────────────────────┘
```

- Una sola columna, contenido alineado a la izquierda. Nada centrado estilo marketing.
- La cabecera y el pie son chrome tenue; la superficie de trabajo es la protagonista.
- En móvil, las hojas modales suben desde abajo (`<dialog>` nativo + animación).

### Radio (codifica jerarquía, no decoración)

`8` control · `12` campo · `16` panel · `20` hoja modal · `28` superficie principal.
Sin trocear todo en tarjetas redondeadas idénticas con la misma sombra gris.

### Sombra (mínima, sólo para elevación)

- `sheet`: `0 24px 48px -12px oklch(0 0 0 / 0.25)` — sólo hojas modales.
- `float`: `0 8px 24px -8px oklch(0 0 0 / 0.16)` — tooltip/toast.

### Movimiento

Un solo momento orquestado: «archivo soltado» → «archivo listo», donde la barra encoge una vez y la
cifra cuenta hasta su valor. 150–300 ms, curvas suaves. `prefers-reduced-motion: reduce` en todo
(la cifra aparece en su valor final, la barra ya encogida). Translucidez sutil
(`backdrop-filter: saturate(1.6) blur(20px)`) sólo en cabecera y hojas modales, con fallback sólido.

### Principios

1. Gastar la audacia en un solo sitio (la cifra y su barra).
2. Todo lo demás, callado, pequeño y ordenado.
3. Blanco puro donde se juzga color; gris frío donde no.
4. El radio y la sombra codifican jerarquía; no decoran.
5. Un acento vivo, usado con disciplina.

---

## Pasada 2 — Crítica anti-default

Reviso el plan contra el brief (§7) y contra los tells genéricos que señala la skill.

### 1. Acento: **cian de mesa de luz** en vez de índigo (decisión revisada)

El brief dejaba dos candidatos y pedía elegir uno justificándolo. Elegí cian
(`oklch(0.62 0.14 210)`) y **descarté índigo** (`oklch(0.52 0.20 275)`).

- **Motivo**: el índigo saturado es el acento "producto" más común (Stripe, Linear, mil dashboards);
  sobre un fondo blanco y gris frío, un índigo habría leído como otro SaaS más. El cian de mesa de
  luz es instrumental y está ligado al tema (la mesa de luz es donde fotógrafos y retocadores
  inspeccionan película y diapositivas — exactamente la tarea de Tolva: juzgar píxeles).
- **Segunda razón**: el cian deja el **verde** libre para «éxito» y el **rojo** para «error» sin
  colisión perceptiva. Un índigo saturado se acerca más al azul de Apple (`#007AFF`, prohibido) que
  el cian elegido.
- La decisión completa vive en `docs/adr/0015-acento.md`.

### 2. El negro del texto no es `#111` ni `#0B0B0B`

En vez de un "falso negro tintado", el texto principal es `oklch(0.23 0.01 250)`: un gris frío muy
oscuro, coherente con el chrome frío, y no un negro cálido de plantilla. En oscuro, el texto es
`oklch(0.96 0.003 240)`, no blanco puro a secas, para evitar el contraste estridente.

### 3. Sin hero de marketing, sin tres tarjetas de features

Un diseño genérico habría abierto con titular + subtítulo + tarjetas de «comprimir», «redimensionar»,
«convertir». Aquí no: la pantalla inicial es la zona de arrastre y el único elemento con volumen es
la cifra. Esa es la diferencia de raíz con cualquier página de producto.

### 4. El botón primario no es un "botón de color"

En vez de rellenar el botón principal de cian (lo que forzaría un `on-accent` de contraste precario
en una cifra de croma media), el botón primario es **casi negro con texto blanco** (contraste limpio,
AA de sobra) y el cian se reserva para los momentos con significado: el foco, la selección, el
`switch` encendido, el `segmented` activo, la flecha «→» de la cifra y el relleno de la barra. Esto
mantiene el acento "vivo" sin diluirlo.

### 5. Tipografía: SF nativa, no un webfont como primera opción

Muchos productos cargan un webfont (Inter/Geist) como primera fuente. Aquí el stack de sistema va
primero (SF Pro nativo y legítimo en Apple) e Inter autoalojada es el fallback. La personalidad no
depende de una fuente decorativa, sino del contraste de escala de la cifra.

### 6. Checklist de prohibiciones del §7.4, verificado de uno en uno

- Sin eyebrow en mayúsculas espaciadas sobre títulos — **cumplido**.
- Sin cadenas de metadatos unidas con «·» — **cumplido**.
- Sin «→» pegado a botones/enlaces — **cumplido** (la «→» sólo aparece entre los dos tamaños de la
  cifra, donde significa transformación real).
- Sin numeración 01/02/03 salvo secuencia real (la cola de trabajos sí lo es) — **cumplido**.
- Sin tarjetas redondeadas idénticas con sombra `rgba(0,0,0,.1)` — **cumplido** (radio jerárquico,
  sombra sólo para elevación).
- Sin lavados de degradado como decoración — **cumplido**.
