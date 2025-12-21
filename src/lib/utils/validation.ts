/**
 * Utilidades de validación
 */

/**
 * Valida que una cadena no esté vacía después de trim
 */
export function isNotEmpty(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().length > 0;
}

/**
 * Valida formato de email básico
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida que un string tenga longitud entre min y max
 */
export function isValidLength(
  value: string,
  min: number,
  max: number
): boolean {
  return value.length >= min && value.length <= max;
}

