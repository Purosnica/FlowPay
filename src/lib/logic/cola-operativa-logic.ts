/**
 * Avance de cola operativa (siguiente caso tras gestión/pago).
 */

export function indiceEnColaPorId(
  ids: readonly number[],
  idActual: number,
): number {
  return ids.indexOf(idActual);
}

/**
 * Devuelve el siguiente id en la cola tras `idActual`, o null si no hay más.
 */
export function siguienteIdEnCola(
  ids: readonly number[],
  idActual: number,
): number | null {
  const idx = indiceEnColaPorId(ids, idActual);
  if (idx < 0) {
    return ids[0] ?? null;
  }
  return ids[idx + 1] ?? null;
}

export function clampIndiceCola(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  if (index < 0) {
    return 0;
  }
  if (index >= length) {
    return length - 1;
  }
  return index;
}

export function moverIndiceCola(
  index: number,
  length: number,
  delta: number,
): number {
  return clampIndiceCola(index + delta, length);
}
