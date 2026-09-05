/**
 * Formateo de bytes en es-ES (coma decimal), porcentaje de ahorro y ahorro
 * negativo presentado con honestidad (§8.1).
 */

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
const BYTES_PER_UNIT = 1024;

/** Redondea a un decimal y lo formatea en es-ES (coma decimal). */
function formatDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace(".", ",");
}

/**
 * Formatea un tamaño en bytes con separador decimal en coma, p. ej.
 * `512 B`, `1,9 MB`, `34,7 MB`. Los valores no finitos o negativos se tratan
 * como `0 B`.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  let value = bytes;
  let unit = 0;
  while (value >= BYTES_PER_UNIT && unit < UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unit += 1;
  }
  if (unit === 0) return `${Math.round(value)} ${UNITS[unit]}`;
  return `${formatDecimal(value)} ${UNITS[unit]}`;
}

/**
 * Porcentaje de ahorro entre el original y el resultado. Positivo = el
 * resultado pesa menos; negativo = pesa más (se devuelve el signo, sin
 * disfrazar el dato). `NaN`/`Infinity` cuando no se puede calcular.
 */
export function savingsPercent(originalBytes: number, resultBytes: number): number {
  if (!Number.isFinite(originalBytes) || !Number.isFinite(resultBytes) || originalBytes <= 0) {
    return Number.NaN;
  }
  return ((originalBytes - resultBytes) / originalBytes) * 100;
}

/**
 * Formatea un porcentaje de ahorro en es-ES, conservando el signo: `"94,0 %"`
 * cuando adelgaza, `"−12,3 %"` cuando engorda, `"0 %"` cuando no cambia.
 */
export function formatSavings(percent: number): string {
  if (!Number.isFinite(percent)) return "—";
  if (Math.abs(percent) < 0.05) return "0 %";
  return `${formatDecimal(percent)} %`;
}
