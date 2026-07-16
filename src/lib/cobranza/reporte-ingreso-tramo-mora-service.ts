import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { roundMoney } from './decimal-utils';
import { simularLiquidacion } from './liquidacion-service';
import {
  cargarTramosRecuperacionMandante,
  comisionTramosADefs,
} from './comision-cobro-service';
import { diasMoraEnTramo } from './tramos-mora';
import type {
  ReporteIngresoTramoItem,
  ReporteIngresoTramoMora,
} from '@/types/cobranza';

/**
 * Rentabilidad detallada por tramo de mora de recuperación del Mandante
 * (share e ingreso).
 */
export async function obtenerReporteIngresoTramoMora(
  idmandante: number,
  idusuario: number,
  periodo: string,
): Promise<ReporteIngresoTramoMora> {
  await requerirAccesoMandante(idusuario, idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const [sim, tramosRecuperacion] = await Promise.all([
    simularLiquidacion(idmandante, periodo, idusuario),
    cargarTramosRecuperacionMandante(idmandante),
  ]);
  const totalIngresoEmpresa = sim.totalIngresoEmpresa;
  const totalComision = sim.totalComision;
  const gananciaNeta = roundMoney(totalIngresoEmpresa - totalComision);

  const defs = comisionTramosADefs(tramosRecuperacion);
  const porTramo: ReporteIngresoTramoItem[] = defs.map((def) => {
    const enTramo = sim.detalle.filter((d) =>
      diasMoraEnTramo(d.diasMora, def.tramoMoraMin, def.tramoMoraMax),
    );
    const recuperado = roundMoney(
      enTramo.reduce((s, d) => s + d.monto, 0),
    );
    const ingreso = roundMoney(
      enTramo.reduce((s, d) => s + d.ingresoEmpresa, 0),
    );
    const comision = roundMoney(
      enTramo.reduce((s, d) => s + d.montoComision, 0),
    );
    const neta = roundMoney(ingreso - comision);
    return {
      tramo: def.tramo,
      tramoMoraMin: def.tramoMoraMin,
      tramoMoraMax: def.tramoMoraMax,
      cantidadPagos: enTramo.length,
      totalRecuperado: recuperado,
      totalIngresoEmpresa: ingreso,
      totalComision: comision,
      gananciaNeta: neta,
      margenPct: ingreso > 0 ? roundMoney((neta / ingreso) * 100) : 0,
      shareIngresoPct:
        totalIngresoEmpresa > 0
          ? roundMoney((ingreso / totalIngresoEmpresa) * 100)
          : 0,
    };
  });

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: sim.periodo,
    totalIngresoEmpresa,
    totalComision,
    gananciaNeta,
    porTramo,
  };
}
