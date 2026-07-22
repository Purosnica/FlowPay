/**
 * Política de contraseñas (H26).
 */

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_MIN_MESSAGE =
  `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;

export const PASSWORD_COMPLEXITY_MESSAGE =
  'La contraseña debe incluir mayúscula, minúscula y un número';

export function cumpleComplejidadPassword(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return false;
  }
  return /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

/** Mensaje de error o null si cumple. */
export function validarPoliticaPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return PASSWORD_MIN_MESSAGE;
  }
  if (!cumpleComplejidadPassword(password)) {
    return PASSWORD_COMPLEXITY_MESSAGE;
  }
  return null;
}
