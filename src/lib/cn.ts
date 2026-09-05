/**
 * Une clases condicionales. Sin dependencias: suficiente para un sistema de
 * diseño donde cada variante construye una cadena completa (sin colisiones).
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
