/**
 * Reporte aging de cartera por tramos de mora del Mandante.
 */

import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import {
  cargarTramosRecuperacionMandante,
  comisionTramosADefs,
} from './comision-cobro-service';
import { diasMoraEnTramo } from './tramos-mora';
import type {
  AgingTramoReporte,
  ReporteAgingCartera,
} from '@/types/cobranza';

export type AgingTramo = AgingTramoReporte;
export type { ReporteAgingCartera };

export async function obtenerReporteAgingCartera(
  idmandante: number,
  idusuario: number,
): Promise<ReporteAgingCartera> {
  await requerirAccesoMandante(idusuario, idmandante);

  const [prestamos, tramosRecuperacion] = await Promise.all([
    prisma.tbl_prestamo.findMany({
      where: {
        idmandante,
        deletedAt: null,
        saldoTotal: { gt: 0 },
        estado: { not: 'Cancelado' },
      },
      select: { diasMora: true, saldoTotal: true },
    }),
    cargarTramosRecuperacionMandante(idmandante),
  ]);

  const saldoCarteraTotal = roundMoney(
    prestamos.reduce((s, p) => s + decimalToNumber(p.saldoTotal), 0),
  );

  const defs = comisionTramosADefs(tramosRecuperacion);
  const tramos: AgingTramo[] = defs.map((def) => {
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
