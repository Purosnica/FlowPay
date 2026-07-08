import { prisma } from '@/lib/prisma';
import { filtroMandante } from './mandante-scope';
import { decimalToNumber } from './decimal-utils';
import { contarPromesasVencidas } from './promesas-vencidas-service';
import type { DashboardResumenCobranza } from '@/types/cobranza';

export type { DashboardResumenCobranza };

export async function obtenerResumenDashboard(
  idusuario: number,
): Promise<DashboardResumenCobranza> {
  const mandanteFilter = await filtroMandante(idusuario);
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const prestamoWhere = {
    deletedAt: null,
    idmandante: mandanteFilter,
  };

  const [totalPrestamos, prestamosEnMora, aggSaldo, gestionesMes, pagosMes, pagosConciliadosMes, reclamosAbiertos, promesasVencidas] =
    await Promise.all([
      prisma.tbl_prestamo.count({ where: prestamoWhere }),
      prisma.tbl_prestamo.count({
        where: { ...prestamoWhere, diasMora: { gt: 0 } },
      }),
      prisma.tbl_prestamo.aggregate({
        where: prestamoWhere,
        _sum: { saldoTotal: true },
      }),
      prisma.tbl_gestion.count({
        where: {
          deletedAt: null,
          idmandante: mandanteFilter,
          fechaGestion: { gte: inicioMes },
        },
      }),
      prisma.tbl_pago.count({
        where: {
          deletedAt: null,
          idmandante: mandanteFilter,
          fechaPago: { gte: inicioMes },
        },
      }),
      prisma.tbl_pago.count({
        where: {
          deletedAt: null,
          aplicado: true,
          idmandante: mandanteFilter,
          fechaPago: { gte: inicioMes },
        },
      }),
      prisma.tbl_reclamo.count({
        where: {
          deletedAt: null,
          idmandante: mandanteFilter,
          estado: { in: ['ABIERTO', 'EN_PROCESO'] },
        },
      }),
      contarPromesasVencidas(idusuario, true),
    ]);

  return {
    totalPrestamos,
    prestamosEnMora,
    saldoCartera: decimalToNumber(aggSaldo._sum.saldoTotal),
    gestionesMes,
    pagosMes,
    pagosConciliadosMes,
    reclamosAbiertos,
    promesasVencidas,
  };
}
