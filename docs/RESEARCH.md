# Investigación previa

> Nos inspiramos en **patrones de interacción** (arrastrar y soltar, cola de trabajos,
> comparador antes/después con divisor, presets con nombre, panel de propiedades junto al
> lienzo). Los patrones de interacción no son objeto de protección por derechos de autor.
> **No copiamos ni reutilizamos** nombres, marcas, logotipos, paletas de color, iconografía,
> ilustraciones, textos de interfaz, textos legales, ni disposiciones de pantalla reconocibles de
> Squoosh, iLoveIMG, TinyPNG, CloudConvert, Convertio, HandBrake, Photopea, Canva, Figma ni de
> ninguna otra herramienta. No se ha inspeccionado ni derivado código de ninguna de ellas. La única
> excepción declarada es jSquash, que es un derivado *publicado bajo Apache-2.0* de los códecs de
> Squoosh y se consume como dependencia npm con su atribución en `THIRD_PARTY_NOTICES.md`.

Los datos de esta sección se verificaron contra la fuente (caniuse, documentación de Vercel,
registro de npm y repositorios de origen) el **2026-09-05**.

---

## 1. Soporte de navegadores

| Capacidad | Uso global | Detalle |
|---|---|---|
| **WebCodecs** | 94,47 % | Chrome/Edge 94+, Firefox 130+, Safari parcial 16.4–18.7 y **completo desde 26.0**. Firefox Android sin soporte. |
| **AVIF (decodificación)** | 95,36 % | Chrome 85+, Firefox 93+, Safari 16.4+ (parcial 16.1), iOS 16+. |
| **OffscreenCanvas** | 95,99 % | Chrome 69+, Edge 79+, Firefox 105+, Safari 17+ (parcial 16.2–16.6). |
| **JPEG XL** | **14,63 %** | Desactivado por defecto en Chrome (145+) y Firefox; **parcial en Safari 17+**. |
| **File System Access API** | **30,85 %** | Sólo Chromium 105+. Firefox tiene posición pública «harmful». Safari no. Nada en móvil. |
| **HEIC/HEIF** | Sólo Apple | Safari 17+ / macOS Sonoma+ / iOS 17+ decodifican vía el códec del sistema, accesible desde `createImageBitmap`. Chrome y Firefox lanzan excepción: no envían decodificador HEVC por el coste y la disputa de las patentes (MPEG LA, HEVC Advance, Velos Media). |

### Consecuencias de producto

- **JPEG XL sólo tiene sentido como formato de salida, con aviso.** Podemos *codificar* JXL con el
  WASM de jSquash aunque el navegador no lo sepa mostrar. La UI dice literalmente que el fichero
  resultante no se verá en la mayoría de navegadores. Es una función legítima (archivo, fotografía)
  que ningún conversor de cliente ofrece bien.
- **File System Access no es el camino principal de guardado.** Se usa como mejora progresiva en
  Chromium (elegir carpeta de destino en lote); el camino por defecto es `<a download>` con object
  URL, y en lote un ZIP.
- **HEIC se lee sólo donde el sistema operativo lo permite.** Ver ADR-0005.

---

## 2. Herramientas de referencia

| Herramienta | Dónde procesa | Formatos / alcance | Límites declarados |
|---|---|---|---|
| **Squoosh** (Google Chrome Labs, Apache-2.0) | **Cliente**, declarado explícitamente: «Squoosh does not send your image to a server. All image compression processes locally.» | Compresión y conversión de imagen con códecs WASM | Sin límites de tamaño. Una imagen cada vez; sin lote, sin recorte real, sin vídeo. |
| **TinyPNG** | **Servidor** (retención declarada de 48 h) | JPEG XL, AVIF, WebP, JPG, PNG, APNG | **20 imágenes a la vez, 5 MB cada una**; conversión de formato gratis sólo para **3 imágenes**. |
| **iLoveIMG** | Servidor | JPG, PNG, SVG, GIF, TIF, PSD, WEBP, HEIC, RAW. Herramientas: comprimir, redimensionar, recortar, convertir, marca de agua, quitar fondo, pixelar caras, meme | No publica los límites del plan gratuito en portada; el lote y las funciones de IA son de pago. |
| **CloudConvert** | Servidor (retención según política; auditoría externa) | **212 formatos** en 11 categorías | Minutos de conversión y tamaños no publicados en portada; requieren cuenta. |
| **HandBrake** | Escritorio, GPL-2.0 | Transcodificación de vídeo | No es web. Interesa por su **modelo de presets** ("Fast 1080p30", "Web Optimized"), que copiamos como *patrón* de interacción, no como código. |
| **Photopea / Canva / Figma** | Cliente (Photopea) / servidor | Editores | Interesan por el **modelo de editor**: lienzo + panel de propiedades + historial no destructivo. |

**Nuestro hueco competitivo, en una frase:** Squoosh demuestra que el cliente basta pero se queda
en una imagen y sin vídeo; los conversores de servidor tienen el alcance pero imponen límites de
tamaño y cantidad porque cada fichero les cuesta dinero. Tolva hace lote y vídeo **sin límite de
tamaño**, porque el coste marginal de un fichero es cero para nosotros.

---

## 3. Restricciones de la plataforma (Vercel)

Plan **Hobby**: duración máxima de función 60 s (por defecto 10 s) · tiempo de build 45 min ·
subida de ficheros estáticos 100 MB · 100 despliegues al día · 1 build concurrente ·
**no se pueden conectar repositorios propiedad de una organización de Git a un equipo Hobby**
(el nuestro es personal, así que no aplica).

Esto cierra el argumento con números: un vídeo de 200 MB ni siquiera cabe en el cuerpo de una
petición, y 60 s no transcodifican nada. **Y hay una consecuencia mejor:** como no necesitamos
ninguna función, el proyecto se compila con `output: 'export'` — HTML, CSS, JS y WASM estáticos,
cero funciones desplegadas. La promesa de privacidad deja de ser una política y pasa a ser una
propiedad estructural: **no existe ningún endpoint al que subir un fichero.**

> Nota: el plan Hobby de Vercel es para uso personal no comercial según sus condiciones. Si Tolva
> llegara a monetizarse haría falta plan Pro.

---

## 4. Verificación y vigencia

Los datos de caniuse, del registro de npm y de la documentación de Vercel se comprobaron el día de
cierre del plan. Los números de *uso global* de caniuse cambian despacio; lo que sí puede cambiar
son los *detalles* (p. ej. el nivel de WebCodecs de Safari, que se completó en 26.0). El ejecutor
los re-verificó el mismo día y no encontró cambios respecto a lo anotado.
