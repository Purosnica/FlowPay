import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { roundMoney } from './decimal-utils';
import { simularLiquidacion } from './liquidacion-service';
import { TRAMOS_MORA, diasMoraEnTramo } from './tramos-mora';
import type {
  ReporteGanancias,
  ReporteGananciasGestorItem,
  ReporteGananciasTramoItem,
} from '@/types/cobranza';

function margenPct(gananciaNeta: number, ingreso: number): number {
  if (ingreso <= 0) {
    return 0;
  }
  return roundMoney((gananciaNeta / ingreso) * 100);
}

/**
 * Reporte de ganancias del periodo a partir de pagos aplicados
 * (misma fórmula que liquidación: ingresoEmpresa − comisión).
 */
export async function obtenerReporteGanancias(
  idmandante: number,
  idusuario: number,
  periodo: string,
): Promise<ReporteGanancias> {
  await requerirAccesoMandante(idusuario, idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const sim = await simularLiquidacion(idmandante, periodo, idusuario);
  const gananciaNeta = roundMoney(
    sim.totalIngresoEmpresa - sim.totalComision,
  );

  const porGestorMap = new Map<
    string,
    {
      idgestor: number | null;
      nombre: string;
      cantidadPagos: number;
      totalRecuperado: number;
      totalIngresoEmpresa: number;
      totalComision: number;
    }
  >();

  for (const d of sim.detalle) {
    const key = d.idgestor != null ? String(d.idgestor) : 'null';
    const prev = porGestorMap.get(key) ?? {
      idgestor: d.idgestor,
      nombre: d.nombreGestor ?? 'Sin gestor',
      cantidadPagos: 0,
      totalRecuperado: 0,
      totalIngresoEmpresa: 0,
      totalComision: 0,
    };
    prev.cantidadPagos += 1;
    prev.totalRecuperado += d.monto;
    prev.totalIngresoEmpresa += d.ingresoEmpresa;
    prev.totalComision += d.montoComision;
    porGestorMap.set(key, prev);
  }

  const porGestor: ReporteGananciasGestorItem[] = [...porGestorMap.values()]
    .map((g) => {
      const totalRecuperado = roundMoney(g.totalRecuperado);
      const totalIngresoEmpresa = roundMoney(g.totalIngresoEmpresa);
      const totalComision = roundMoney(g.totalComision);
      const neta = roundMoney(totalIngresoEmpresa - totalComision);
      return {
        idgestor: g.idgestor,
        nombre: g.nombre,
        cantidadPagos: g.cantidadPagos,
        totalRecuperado,
        totalIngresoEmpresa,
        totalComision,
        gananciaNeta: neta,
        margenPct: margenPct(neta, totalIngresoEmpresa),
      };
    })
    .sort((a, b) => b.gananciaNeta - a.gananciaNeta);

  const porTramoMora: ReporteGananciasTramoItem[] = TRAMOS_MORA.map((def) => {
    const enTramo = sim.detalle.filter((d) =>
      diasMoraEnTramo(d.diasMora, def.tramoMoraMin, def.tramoMoraMax),
    );
    const totalRecuperado = roundMoney(
      enTramo.reduce((s, d) => s + d.monto, 0),
    );
    const totalIngresoEmpresa = roundMoney(
      enTramo.reduce((s, d) => s + d.ingresoEmpresa, 0),
    );
    const totalComision = roundMoney(
      enTramo.reduce((s, d) => s + d.montoComision, 0),
    );
    return {
      tramo: def.tramo,
      tramoMoraMin: def.tramoMoraMin,
      tramoMoraMax: def.tramoMoraMax,
      cantidadPagos: enTramo.length,
      totalRecuperado,
      totalIngresoEmpresa,
      totalComision,
      gananciaNeta: roundMoney(totalIngresoEmpresa - totalComision),
    };
  }).filter((t) => t.cantidadPagos > 0);

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: sim.periodo,
    cantidadPagos: sim.cantidadPagos,
    totalRecuperado: sim.totalRecuperado,
    totalIngresoEmpresa: sim.totalIngresoEmpresa,
    totalComision: sim.totalComision,
    gananciaNeta,
    margenPct: margenPct(gananciaNeta, sim.totalIngresoEmpresa),
    porGestor,
    porTramoMora,
  };
}
