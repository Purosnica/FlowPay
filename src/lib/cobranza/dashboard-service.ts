import { prisma } from '@/lib/prisma';
import { filtroMandante } from './mandante-scope';
import { decimalToNumber } from './decimal-utils';
import { contarPromesasVencidas } from './promesas-vencidas-service';
import {
  filtroFechaEnPeriodo,
  rangoPeriodoActual,
} from './periodo-utils';
import type { DashboardResumenCobranza } from '@/types/cobranza';
import {
  claveCacheResumenDashboard,
  conCacheKpi,
} from '@/lib/cache/kpi-cache';

export type { DashboardResumenCobranza };

export async function obtenerResumenDashboard(
  idusuario: number,
): Promise<DashboardResumenCobranza> {
  const mandanteFilter = await filtroMandante(idusuario);
  const cacheKey = claveCacheResumenDashboard(idusuario, mandanteFilter);

  return conCacheKpi(cacheKey, async () => {
    const rangoMes = filtroFechaEnPeriodo(rangoPeriodoActual());

    const prestamoWhere = {
      deletedAt: null,
      idmandante: mandanteFilter,
    };

    const [
      totalPrestamos,
      prestamosEnMora,
      aggSaldo,
      gestionesMes,
      pagosMes,
      pagosConciliadosMes,
      reclamosAbiertos,
      promesasVencidas,
    ] = await Promise.all([
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
          fechaGestion: rangoMes,
        },
      }),
      prisma.tbl_pago.count({
        where: {
          deletedAt: null,
          idmandante: mandanteFilter,
          fechaPago: rangoMes,
        },
      }),
      prisma.tbl_pago.count({
        where: {
          deletedAt: null,
          aplicado: true,
          idmandante: mandanteFilter,
          fechaPago: rangoMes,
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
  });
}
