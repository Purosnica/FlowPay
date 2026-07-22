/**
 * Reporte aging de cartera por tramos de mora del Mandante.
 * Agregación en BD (H14) — no carga la cartera completa en memoria.
 */

import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import {
  cargarTramosRecuperacionMandante,
  comisionTramosADefs,
} from './comision-cobro-service';
import type {
  AgingTramoReporte,
  ReporteAgingCartera,
} from '@/types/cobranza';

export type AgingTramo = AgingTramoReporte;
export type { ReporteAgingCartera };

function whereBaseAging(idmandante: number) {
  return {
    idmandante,
    deletedAt: null,
    saldoTotal: { gt: 0 },
    estado: { not: 'Cancelado' },
  } as const;
}

export async function obtenerReporteAgingCartera(
  idmandante: number,
  idusuario: number,
): Promise<ReporteAgingCartera> {
  await requerirAccesoMandante(idusuario, idmandante);

  const tramosRecuperacion =
    await cargarTramosRecuperacionMandante(idmandante);
  const defs = comisionTramosADefs(tramosRecuperacion);
  const base = whereBaseAging(idmandante);

  const totalAgg = await prisma.tbl_prestamo.aggregate({
    where: base,
    _sum: { saldoTotal: true },
    _count: { _all: true },
  });

  const saldoCarteraTotal = roundMoney(
    decimalToNumber(totalAgg._sum.saldoTotal),
  );
  const totalPrestamos = totalAgg._count._all;

  const tramos: AgingTramo[] = [];

  for (const def of defs) {
    const diasWhere =
      def.tramoMoraMax === null
        ? { gte: def.tramoMoraMin }
        : { gte: def.tramoMoraMin, lte: def.tramoMoraMax };

    const agg = await prisma.tbl_prestamo.aggregate({
      where: {
        ...base,
        diasMora: diasWhere,
      },
      _sum: { saldoTotal: true },
      _count: { _all: true },
    });

    const saldoTramo = roundMoney(decimalToNumber(agg._sum.saldoTotal));
    const porcentajeSaldo =
      saldoCarteraTotal > 0
        ? roundMoney((saldoTramo / saldoCarteraTotal) * 100)
        : 0;

    tramos.push({
      tramo: def.tramo,
      tramoMoraMin: def.tramoMoraMin,
      tramoMoraMax: def.tramoMoraMax,
      cantidadPrestamos: agg._count._all,
      saldoTotal: saldoTramo,
      porcentajeSaldo,
    });
  }

  return {
    idmandante,
    saldoCarteraTotal,
    totalPrestamos,
    tramos,
  };
}
