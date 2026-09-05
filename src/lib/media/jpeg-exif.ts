/**
 * Utilidades puras de bytes sobre los segmentos EXIF de un JPEG (§8.3).
 *
 * `createImageBitmap` aplica la orientación EXIF automáticamente en Chromium
 * (ignora `imageOrientation: "none"`), de modo que para decodificar los píxeles
 * **crudos** y aplicar la orientación nosotros en el worker, primero hay que
 * quitar el segmento APP1 de EXIF. Puro (sin APIs del navegador), testeable en
 * Node y compartido entre `readExif` (hilo principal) y el worker de imagen.
 */

/** ¿El segmento que empieza en `i` (0xFF) es un APP1 con payload "Exif\0\0"? */
function isExifApp1At(bytes: Uint8Array, i: number): boolean {
  return (
    i + 9 < bytes.length &&
    bytes[i] === 0xff &&
    bytes[i + 1] === 0xe1 &&
    bytes[i + 4] === 0x45 && // 'E'
    bytes[i + 5] === 0x78 && // 'x'
    bytes[i + 6] === 0x69 && // 'i'
    bytes[i + 7] === 0x66 && // 'f'
    bytes[i + 8] === 0x00 &&
    bytes[i + 9] === 0x00
  );
}

/** ¿Contiene `input` un segmento APP1 de EXIF? */
export function hasExifApp1(input: ArrayBuffer | Uint8Array): boolean {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (b.length < 12 || b[0] !== 0xff || b[1] !== 0xd8) return false;

  let i = 2;
  while (i + 3 < b.length) {
    if (b[i] !== 0xff) return false; // fuera de la cabecera: no quedan segmentos
    const marker = b[i + 1];
    if (marker === 0xda || marker === 0xd9) return false; // SOS/EOI: fin de la cabecera
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    } // RST/TEM sin longitud
    if (marker === 0xff) {
      i += 1;
      continue;
    } // byte de relleno
    if (marker === 0x00) {
      i += 2;
      continue;
    } // byte relleno dentro de datos

    const length = (b[i + 2] << 8) | b[i + 3];
    if (length < 2 || i + 2 + length > b.length) return false; // longitud corrupta
    if (isExifApp1At(b, i)) return true;
    i += 2 + length;
  }
  return false;
}

/**
 * Elimina los segmentos APP1 "Exif\0\0" de un JPEG (quita la orientación EXIF).
 * Si no hay EXIF, devuelve el mismo `ArrayBuffer` sin copiar.
 */
export function stripExifApp1(input: ArrayBuffer): ArrayBuffer {
  const b = new Uint8Array(input);
  if (!hasExifApp1(b)) return input;

  const parts: Uint8Array[] = [b.subarray(0, 2)]; // SOI
  let i = 2;
  while (i + 1 < b.length) {
    if (b[i] !== 0xff) {
      parts.push(b.subarray(i));
      break;
    }
    const marker = b[i + 1];
    if (marker === 0xda || marker === 0xd9) {
      parts.push(b.subarray(i));
      break;
    } // SOS/EOI: copiar el resto intacto
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (marker === 0xff) {
      parts.push(b.subarray(i, i + 1));
      i += 1;
      continue;
    }
    if (marker === 0x00) {
      parts.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }

    if (i + 3 >= b.length) {
      parts.push(b.subarray(i));
      break;
    } // sin sitio para la longitud: copiar el resto
    const length = (b[i + 2] << 8) | b[i + 3];
    if (length < 2 || i + 2 + length > b.length) {
      parts.push(b.subarray(i));
      break;
    }
    if (!isExifApp1At(b, i)) {
      parts.push(b.subarray(i, i + 2 + length));
    }
    i += 2 + length;
  }

  let total = 0;
  for (const part of parts) total += part.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const part of parts) {
    out.set(part, off);
    off += part.length;
  }
  return out.buffer;
}
