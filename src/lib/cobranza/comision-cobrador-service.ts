import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decimalToNumber } from './decimal-utils';

type Tx = Prisma.TransactionClient | typeof prisma;

/**
 * Resuelve el % de comisión del cobrador: prioriza override por mandante,
 * luego el % global del usuario.
 */
export function resolverPorcentajeComisionCobrador(
  porcentajeMandante: number | null | undefined,
  porcentajeUsuario: number,
): number {
  if (porcentajeMandante !== null && porcentajeMandante !== undefined) {
    return porcentajeMandante;
  }
  return porcentajeUsuario;
}

export type MapaComisionCobradorMandante = Map<number, number | null>;

export async function cargarMapaComisionCobradorMandante(
  idmandante: number,
  tx: Tx = prisma,
): Promise<MapaComisionCobradorMandante> {
  const rows = await tx.tbl_usuario_mandante.findMany({
    where: { idmandante },
    select: { idusuario: true, porcentajeComision: true },
  });

  return new Map(
    rows.map((row) => [
      row.idusuario,
      row.porcentajeComision !== null
        ? decimalToNumber(row.porcentajeComision)
        : null,
    ]),
  );
}

export function resolverComisionDesdeMapa(
  mapa: MapaComisionCobradorMandante,
  idgestor: number | null,
  porcentajeUsuario: number,
): number {
  if (!idgestor) {
    return 0;
  }
  const overrideMandante = mapa.get(idgestor);
  return resolverPorcentajeComisionCobrador(
    overrideMandante,
    porcentajeUsuario,
  );
}
