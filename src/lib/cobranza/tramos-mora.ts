/**
 * Utilidades de tramos de mora.
 * Las bandas vienen de la parametrización del Mandante
 * (`tbl_comision_cobro`), no de constantes fijas.
 */

export interface TramoMoraDef {
  tramo: string;
  tramoMoraMin: number;
  tramoMoraMax: number | null;
}

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

/** Etiqueta legible para un tramo de mora parametrizado. */
export function formatTramoMoraLabel(
  tramoMoraMin: number,
  tramoMoraMax: number | null,
): string {
  if (tramoMoraMin === 0 && tramoMoraMax === 0) {
    return 'Al día (0)';
  }
  if (tramoMoraMax === null) {
    return `${tramoMoraMin}+ días`;
  }
  return `${tramoMoraMin}-${tramoMoraMax} días`;
}

export function resolverTramoMoraDef(
  defs: TramoMoraDef[],
  diasMora: number,
): TramoMoraDef | undefined {
  return defs.find((t) =>
    diasMoraEnTramo(diasMora, t.tramoMoraMin, t.tramoMoraMax),
  );
}

/** Tramo con mayor mora mínima (el más severo / último). */
export function tramoMoraMasSevero(
  defs: TramoMoraDef[],
): TramoMoraDef | undefined {
  if (defs.length === 0) {
    return undefined;
  }
  return defs.reduce((a, b) =>
    a.tramoMoraMin >= b.tramoMoraMin ? a : b,
  );
}
