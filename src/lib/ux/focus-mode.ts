/**
 * Modo foco solo aplica en Mi día (I180).
 * Evita dejar el dashboard sin navegación en otras rutas.
 */
export const RUTA_FOCO_MI_DIA = '/cobranza/mi-dia';

export function isFocusModeActivo(
  focusMode: boolean,
  pathname: string | null,
): boolean {
  return focusMode === true && pathname === RUTA_FOCO_MI_DIA;
}
