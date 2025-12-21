/**
 * Utilidades para manejo de números
 */

/**
 * Formatea un número en formato compacto (ej: 1.5K, 2M)
 */
export function compactFormat(value: number): string {
  const formatter = new Intl.NumberFormat("en", {
    notation: "compact",
    compactDisplay: "short",
  });

  return formatter.format(value);
}

/**
 * Formatea un número con formato estándar (2 decimales)
 */
export function standardFormat(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Redondea un número a 2 decimales
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Valida que un número sea positivo
 */
export function isPositive(value: number): boolean {
  return value > 0;
}

/**
 * Valida que un número sea no negativo
 */
export function isNonNegative(value: number): boolean {
  return value >= 0;
}

