/**
 * Reporte aging de cartera por tramos de días de mora.
 */

import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import type {
  AgingTramoReporte,
  ReporteAgingCartera,
} from '@/types/cobranza';

export type AgingTramo = AgingTramoReporte;
export type { ReporteAgingCartera };

import { TRAMOS_MORA, diasMoraEnTramo } from './tramos-mora';

export async function obtenerReporteAgingCartera(
  idmandante: number,
  idusuario: number,
): Promise<ReporteAgingCartera> {
  await requerirAccesoMandante(idusuario, idmandante);

  const prestamos = await prisma.tbl_prestamo.findMany({
    where: {
      idmandante,
      deletedAt: null,
      saldoTotal: { gt: 0 },
      estado: { not: 'Cancelado' },
    },
    select: { diasMora: true, saldoTotal: true },
  });

  const saldoCarteraTotal = roundMoney(
    prestamos.reduce((s, p) => s + decimalToNumber(p.saldoTotal), 0),
  );

  const tramos: AgingTramo[] = TRAMOS_MORA.map((def) => {
    const enTramoPrestamos = prestamos.filter((p) =>
      diasMoraEnTramo(p.diasMora, def.tramoMoraMin, def.tramoMoraMax),
    );
    const saldoTramo = roundMoney(
      enTramoPrestamos.reduce(
        (s, p) => s + decimalToNumber(p.saldoTotal),
        0,
      ),
    );
    const porcentajeSaldo =
      saldoCarteraTotal > 0
        ? roundMoney((saldoTramo / saldoCarteraTotal) * 100)
        : 0;

    return {
      tramo: def.tramo,
      tramoMoraMin: def.tramoMoraMin,
      tramoMoraMax: def.tramoMoraMax,
      cantidadPrestamos: enTramoPrestamos.length,
      saldoTotal: saldoTramo,
      porcentajeSaldo,
    };
  });

  return {
    idmandante,
    saldoCarteraTotal,
    totalPrestamos: prestamos.length,
    tramos,
  };
}
