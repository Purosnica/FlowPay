/**
 * Utilidades de formateo
 * 
 * Re-exporta funciones de formateo de otros módulos para mantener compatibilidad
 */

export { formatMessageTime } from "./date";
export { compactFormat, standardFormat } from "./number";

/**
 * Formatea un número como moneda
 */
export function formatCurrency(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formatea un porcentaje
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

