/**
 * Tramos estándar de días de mora para reportes y filtros de cartera.
 */

export interface TramoMoraDef {
  tramo: string;
  tramoMoraMin: number;
  tramoMoraMax: number | null;
}

export const TRAMOS_MORA: TramoMoraDef[] = [
  { tramo: 'Al día (0)', tramoMoraMin: 0, tramoMoraMax: 0 },
  { tramo: '1-30 días', tramoMoraMin: 1, tramoMoraMax: 30 },
  { tramo: '31-60 días', tramoMoraMin: 31, tramoMoraMax: 60 },
  { tramo: '61-90 días', tramoMoraMin: 61, tramoMoraMax: 90 },
  { tramo: '91-120 días', tramoMoraMin: 91, tramoMoraMax: 120 },
  { tramo: '121+ días', tramoMoraMin: 121, tramoMoraMax: null },
];

/** Tramos con mora activa (excluye al día). */
export const TRAMOS_MORA_ACTIVA = TRAMOS_MORA.filter(
  (t) => t.tramoMoraMin > 0,
);

export function encodeTramoMoraKey(
  tramoMoraMin: number,
  tramoMoraMax: number | null,
): string {
  return `${tramoMoraMin}:${tramoMoraMax ?? 'null'}`;
}

export function decodeTramoMoraKey(
  key: string,
): { tramoMoraMin: number; tramoMoraMax: number | null } | null {
  const [minStr, maxStr] = key.split(':');
  const tramoMoraMin = Number(minStr);
  if (!Number.isInteger(tramoMoraMin) || tramoMoraMin < 0) {
    return null;
  }
  if (maxStr === 'null') {
    return { tramoMoraMin, tramoMoraMax: null };
  }
  const tramoMoraMax = Number(maxStr);
  if (!Number.isInteger(tramoMoraMax) || tramoMoraMax < tramoMoraMin) {
    return null;
  }
  return { tramoMoraMin, tramoMoraMax };
}

export function diasMoraEnTramo(
  diasMora: number,
  tramoMoraMin: number,
  tramoMoraMax: number | null,
): boolean {
  if (tramoMoraMax === null) {
    return diasMora >= tramoMoraMin;
  }
  return diasMora >= tramoMoraMin && diasMora <= tramoMoraMax;
}
