import type { tbl_politica_descuento } from '@prisma/client';
import { decimalToNumber } from './decimal-utils';

export interface PoliticaTramo {
  tramoMoraMin: number;
  tramoMoraMax: number | null;
  porcentaje: number;
}

export function mapPoliticas(
  rows: tbl_politica_descuento[],
): PoliticaTramo[] {
  return rows
    .filter((r) => r.estado && !r.deletedAt)
    .map((r) => ({
      tramoMoraMin: r.tramoMoraMin,
      tramoMoraMax: r.tramoMoraMax,
      porcentaje: decimalToNumber(r.porcentaje),
    }))
    .sort((a, b) => a.tramoMoraMin - b.tramoMoraMin);
}

export function resolverPorcentajeMaximoPolitica(
  politicas: PoliticaTramo[],
  diasMora: number,
): number | null {
  const tramo = politicas.find(
    (p) =>
      diasMora >= p.tramoMoraMin &&
      (p.tramoMoraMax === null || diasMora <= p.tramoMoraMax),
  );
  return tramo?.porcentaje ?? null;
}

export function validarPorcentajeContraPolitica(
  porcentajeDesc: number,
  diasMora: number,
  politicas: PoliticaTramo[],
): void {
  if (politicas.length === 0) {
    return;
  }
  const maximo = resolverPorcentajeMaximoPolitica(politicas, diasMora);
  if (maximo !== null && porcentajeDesc > maximo) {
    throw new Error(
      `El descuento ${porcentajeDesc}% excede el máximo permitido (${maximo}%) para ${diasMora} días de mora.`,
    );
  }
}

export function validarPorcentajeContraMandante(
  porcentajeDesc: number,
  descuentoMaximo: number,
  nombreMandante?: string,
): void {
  if (porcentajeDesc > descuentoMaximo) {
    const mandante = nombreMandante ? ` (${nombreMandante})` : '';
    throw new Error(
      `El descuento ${porcentajeDesc}% excede el máximo autorizado para el mandante${mandante} (${descuentoMaximo}%).`,
    );
  }
}
