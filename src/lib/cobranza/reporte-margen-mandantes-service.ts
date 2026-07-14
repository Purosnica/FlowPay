import { prisma } from '@/lib/prisma';
import { obtenerMandantesPermitidos } from './mandante-scope';
import { roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import { simularLiquidacion } from './liquidacion-service';
import type {
  ReporteMargenMandanteItem,
  ReporteMargenMandantes,
} from '@/types/cobranza';

function margenPct(gananciaNeta: number, ingreso: number): number {
  if (ingreso <= 0) {
    return 0;
  }
  return roundMoney((gananciaNeta / ingreso) * 100);
}

/**
 * Comparativo de margen (ingreso − comisión) entre mandantes del usuario.
 */
export async function obtenerReporteMargenMandantes(
  idusuario: number,
  periodo: string,
): Promise<ReporteMargenMandantes> {
  const { periodo: periodoNorm } = parsePeriodo(periodo);
  const ids = await obtenerMandantesPermitidos(idusuario);

  const mandantes =
    ids.length > 0
      ? await prisma.tbl_mandante.findMany({
          where: { idmandante: { in: ids }, deletedAt: null },
          select: { idmandante: true, codigo: true, nombre: true },
          orderBy: { nombre: 'asc' },
        })
      : [];

  const porMandante: ReporteMargenMandanteItem[] = [];

  for (const m of mandantes) {
    const sim = await simularLiquidacion(
      m.idmandante,
      periodoNorm,
      idusuario,
    );
    const gananciaNeta = roundMoney(
      sim.totalIngresoEmpresa - sim.totalComision,
    );
    porMandante.push({
      idmandante: m.idmandante,
      mandanteCodigo: m.codigo,
      mandanteNombre: m.nombre,
      cantidadPagos: sim.cantidadPagos,
      totalRecuperado: sim.totalRecuperado,
      totalIngresoEmpresa: sim.totalIngresoEmpresa,
      totalComision: sim.totalComision,
      gananciaNeta,
      margenPct: margenPct(gananciaNeta, sim.totalIngresoEmpresa),
    });
  }

  porMandante.sort((a, b) => b.gananciaNeta - a.gananciaNeta);

  const totalRecuperado = roundMoney(
    porMandante.reduce((s, m) => s + m.totalRecuperado, 0),
  );
  const totalIngresoEmpresa = roundMoney(
    porMandante.reduce((s, m) => s + m.totalIngresoEmpresa, 0),
  );
  const totalComision = roundMoney(
    porMandante.reduce((s, m) => s + m.totalComision, 0),
  );
  const gananciaNeta = roundMoney(totalIngresoEmpresa - totalComision);

  return {
    periodo: periodoNorm,
    totalRecuperado,
    totalIngresoEmpresa,
    totalComision,
    gananciaNeta,
    margenPct: margenPct(gananciaNeta, totalIngresoEmpresa),
    porMandante,
  };
}
