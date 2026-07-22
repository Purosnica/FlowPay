import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { filtroMandante, requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { obtenerReporteAgingCartera } from './aging-cartera-service';
import {
  cargarTramosRecuperacionPorMandantes,
  comisionTramosADefs,
} from './comision-cobro-service';
import {
  diasMoraEnTramo,
  tramoMoraMasSevero,
} from './tramos-mora';
import {
  filtroFechaEnPeriodo,
  rangoMesRelativo,
  rangoPeriodoActual,
} from './periodo-utils';
import type {
  CentroInteligenciaResumen,
  InsightAutomatico,
} from '@/types/cobranza';
import {
  obtenerResumenDiarioMaterializado,
  type ResumenDiarioCobranza,
} from './resumen-diario-service';

export type { CentroInteligenciaResumen, InsightAutomatico };

async function calcularRecuperacionMes(
  idmandante: number | undefined,
  mandanteFilter: Prisma.IntFilter | undefined,
): Promise<{ actual: number; anterior: number }> {
  const mesActual = filtroFechaEnPeriodo(rangoPeriodoActual());
  const mesAnterior = filtroFechaEnPeriodo(rangoMesRelativo(-1));

  const whereBase = {
    deletedAt: null,
    aplicado: true,
    idmandante: idmandante ?? mandanteFilter,
  };

  const [actual, anterior] = await Promise.all([
    prisma.tbl_pago.aggregate({
      where: { ...whereBase, fechaPago: mesActual },
      _sum: { monto: true },
    }),
    prisma.tbl_pago.aggregate({
      where: {
        ...whereBase,
        fechaPago: mesAnterior,
      },
      _sum: { monto: true },
    }),
  ]);

  return {
    actual: decimalToNumber(actual._sum.monto),
    anterior: decimalToNumber(anterior._sum.monto),
  };
}

function calcularSaludCartera(
  prestamosEnMora: number,
  totalPrestamos: number,
  pctTramoAlto: number,
  promesasVencidas: number,
): number {
  if (totalPrestamos === 0) {
    return 100;
  }
  const moraRatio = prestamosEnMora / totalPrestamos;
  let score = 100;
  score -= moraRatio * 40;
  score -= pctTramoAlto * 0.5;
  score -= Math.min(promesasVencidas * 2, 20);
  return Math.max(0, Math.round(score));
}

function construirInsights(params: {
  variacionRecuperacionPct: number;
  pctTramoAlto: number;
  etiquetaTramoAlto: string;
  promesasVencidas: number;
  acuerdosEnRiesgo: number;
  reclamosFueraSla: number;
}): InsightAutomatico[] {
  const insights: InsightAutomatico[] = [];
  const {
    variacionRecuperacionPct,
    pctTramoAlto,
    etiquetaTramoAlto,
    promesasVencidas,
    acuerdosEnRiesgo,
    reclamosFueraSla,
  } = params;

  if (variacionRecuperacionPct < -10) {
    insights.push({
      id: 'rec-down',
      severidad: 'critical',
      titulo: 'Caída en recuperación',
      descripcion: `La recuperación del mes cayó ${Math.abs(variacionRecuperacionPct)}% vs el mes anterior.`,
      metrica: `${variacionRecuperacionPct}%`,
      accionSugerida: 'Revisar contactabilidad y promesas vencidas por equipo.',
    });
  } else if (variacionRecuperacionPct > 10) {
    insights.push({
      id: 'rec-up',
      severidad: 'info',
      titulo: 'Recuperación en alza',
      descripcion: `Recuperación ${variacionRecuperacionPct}% superior al mes anterior.`,
      metrica: `+${variacionRecuperacionPct}%`,
    });
  }

  if (pctTramoAlto > 25) {
    insights.push({
      id: 'aging-alto',
      severidad: 'warning',
      titulo: 'Concentración en mora severa',
      descripcion: `${pctTramoAlto}% del saldo está en ${etiquetaTramoAlto}.`,
      accionSugerida:
        'Evaluar estrategia de negociación o reasignación especializada.',
    });
  }

  if (promesasVencidas > 0) {
    insights.push({
      id: 'promesas',
      severidad: promesasVencidas > 10 ? 'critical' : 'warning',
      titulo: 'Promesas vencidas sin cumplir',
      descripcion: `${promesasVencidas} promesa(s) vencida(s) requieren seguimiento inmediato.`,
      accionSugerida: 'Priorizar en bandeja y contactar hoy.',
    });
  }

  if (acuerdosEnRiesgo > 0) {
    insights.push({
      id: 'acuerdos',
      severidad: 'warning',
      titulo: 'Acuerdos con cuotas vencidas',
      descripcion: `${acuerdosEnRiesgo} cuota(s) de acuerdo vencida(s).`,
      accionSugerida: 'Ejecutar evaluación de acuerdos o contactar deudor.',
    });
  }

  if (reclamosFueraSla > 0) {
    insights.push({
      id: 'reclamos',
      severidad: 'critical',
      titulo: 'Reclamos fuera de SLA',
      descripcion: `${reclamosFueraSla} reclamo(s) exceden fecha límite legal.`,
      accionSugerida: 'Escalar a supervisor y registrar resolución.',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'ok',
      severidad: 'info',
      titulo: 'Operación estable',
      descripcion:
        'No se detectaron alertas críticas en los indicadores principales.',
    });
  }

  return insights;
}

async function pctTramoAltoMandante(
  idmandante: number,
  idusuario: number,
): Promise<{ pctTramoAlto: number; etiquetaTramoAlto: string }> {
  const aging = await obtenerReporteAgingCartera(idmandante, idusuario);
  const tramoAlto =
    aging.tramos.length > 0
      ? aging.tramos.reduce((a, b) =>
          a.tramoMoraMin >= b.tramoMoraMin ? a : b,
        )
      : undefined;
  return {
    pctTramoAlto: tramoAlto?.porcentajeSaldo ?? 0,
    etiquetaTramoAlto: tramoAlto?.tramo ?? 'tramo más severo',
  };
}

async function construirCentroDesdeMaterializado(
  idusuario: number,
  idmandante: number,
  materializado: ResumenDiarioCobranza,
): Promise<CentroInteligenciaResumen> {
  const { pctTramoAlto, etiquetaTramoAlto } = await pctTramoAltoMandante(
    idmandante,
    idusuario,
  );

  const recuperacion = {
    actual: materializado.recuperacionMesActual,
    anterior: materializado.recuperacionMesAnterior,
  };

  const variacionRecuperacionPct =
    recuperacion.anterior > 0
      ? roundMoney(
          ((recuperacion.actual - recuperacion.anterior) /
            recuperacion.anterior) *
            100,
        )
      : recuperacion.actual > 0
        ? 100
        : 0;

  const prestamosEnMoraPct =
    materializado.totalPrestamos > 0
      ? roundMoney(
          (materializado.prestamosEnMora / materializado.totalPrestamos) * 100,
        )
      : 0;

  const saludCartera = calcularSaludCartera(
    materializado.prestamosEnMora,
    materializado.totalPrestamos,
    pctTramoAlto,
    materializado.promesasVencidas,
  );

  return {
    saludCartera,
    recuperacionMes: recuperacion.actual,
    variacionRecuperacionPct,
    prestamosEnMoraPct,
    promesasVencidas: materializado.promesasVencidas,
    acuerdosEnRiesgo: materializado.acuerdosEnRiesgo,
    reclamosFueraSla: materializado.reclamosFueraSla,
    insights: construirInsights({
      variacionRecuperacionPct,
      pctTramoAlto,
      etiquetaTramoAlto,
      promesasVencidas: materializado.promesasVencidas,
      acuerdosEnRiesgo: materializado.acuerdosEnRiesgo,
      reclamosFueraSla: materializado.reclamosFueraSla,
    }),
  };
}

export async function obtenerCentroInteligencia(
  idusuario: number,
  idmandante?: number,
): Promise<CentroInteligenciaResumen> {
  if (idmandante) {
    await requerirAccesoMandante(idusuario, idmandante);
  }

  const mandanteFilter = idmandante
    ? undefined
    : await filtroMandante(idusuario);

  if (idmandante) {
    const materializado = await obtenerResumenDiarioMaterializado(idmandante);
    if (materializado) {
      return construirCentroDesdeMaterializado(
        idusuario,
        idmandante,
        materializado,
      );
    }
  }

  const prestamoWhere = {
    deletedAt: null,
    idmandante: idmandante ?? mandanteFilter,
    estado: { notIn: ['Cancelado', 'Finalizado'] },
  };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [
    totalPrestamos,
    prestamosEnMora,
    _aggSaldo,
    promesasVencidas,
    acuerdosEnRiesgo,
    reclamosFueraSla,
    recuperacion,
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
        idmandante: idmandante ?? mandanteFilter,
        fechaPromesa: { lt: hoy },
        montoPromesa: { not: null },
        prestamo: {
          deletedAt: null,
          estado: { not: 'Cancelado' },
          saldoTotal: { gt: 0 },
        },
      },
    }),
    prisma.tbl_acuerdo_cuota.count({
      where: {
        estado: 'VENCIDA',
        acuerdo: {
          estado: 'VIGENTE',
          deletedAt: null,
          idmandante: idmandante ?? mandanteFilter,
        },
      },
    }),
    prisma.tbl_reclamo.count({
      where: {
        deletedAt: null,
        idmandante: idmandante ?? mandanteFilter,
        estado: { in: ['ABIERTO', 'EN_PROCESO'] },
        fechaLimite: { lt: hoy },
      },
    }),
    calcularRecuperacionMes(idmandante, mandanteFilter),
  ]);

  let pctTramoAlto = 0;
  let etiquetaTramoAlto = 'tramo más severo';
  if (idmandante) {
    const aging = await pctTramoAltoMandante(idmandante, idusuario);
    pctTramoAlto = aging.pctTramoAlto;
    etiquetaTramoAlto = aging.etiquetaTramoAlto;
  } else {
    const prestamos = await prisma.tbl_prestamo.findMany({
      where: { ...prestamoWhere, saldoTotal: { gt: 0 } },
      select: { diasMora: true, saldoTotal: true, idmandante: true },
    });
    const idsMandante = [
      ...new Set(prestamos.map((p) => p.idmandante)),
    ];
    const tramosPorMandante =
      await cargarTramosRecuperacionPorMandantes(idsMandante);
    const saldoTotal = prestamos.reduce(
      (s, p) => s + decimalToNumber(p.saldoTotal),
      0,
    );
    let saldoAlto = 0;
    for (const p of prestamos) {
      const defs = comisionTramosADefs(
        tramosPorMandante.get(p.idmandante) ?? [],
      );
      const severo = tramoMoraMasSevero(defs);
      if (
        severo &&
        diasMoraEnTramo(p.diasMora, severo.tramoMoraMin, severo.tramoMoraMax)
      ) {
        saldoAlto += decimalToNumber(p.saldoTotal);
      }
    }
    pctTramoAlto =
      saldoTotal > 0 ? roundMoney((saldoAlto / saldoTotal) * 100) : 0;
  }

  const variacionRecuperacionPct =
    recuperacion.anterior > 0
      ? roundMoney(
          ((recuperacion.actual - recuperacion.anterior) /
            recuperacion.anterior) *
            100,
        )
      : recuperacion.actual > 0
        ? 100
        : 0;

  const prestamosEnMoraPct =
    totalPrestamos > 0
      ? roundMoney((prestamosEnMora / totalPrestamos) * 100)
      : 0;

  const saludCartera = calcularSaludCartera(
    prestamosEnMora,
    totalPrestamos,
    pctTramoAlto,
    promesasVencidas,
  );

  return {
    saludCartera,
    recuperacionMes: recuperacion.actual,
    variacionRecuperacionPct,
    prestamosEnMoraPct,
    promesasVencidas,
    acuerdosEnRiesgo,
    reclamosFueraSla,
    insights: construirInsights({
      variacionRecuperacionPct,
      pctTramoAlto,
      etiquetaTramoAlto,
      promesasVencidas,
      acuerdosEnRiesgo,
      reclamosFueraSla,
    }),
  };
}

export async function obtenerTendenciaRecuperacion(
  idusuario: number,
  idmandante?: number,
  meses = 6,
): Promise<Array<{ periodo: string; monto: number }>> {
  if (idmandante) {
    await requerirAccesoMandante(idusuario, idmandante);
  }
  const mandanteFilter = idmandante
    ? undefined
    : await filtroMandante(idusuario);

  const resultado: Array<{ periodo: string; monto: number }> = [];

  for (let i = meses - 1; i >= 0; i--) {
    const rango = rangoMesRelativo(-i);
    const fechaPago = filtroFechaEnPeriodo(rango);

    const agg = await prisma.tbl_pago.aggregate({
      where: {
        deletedAt: null,
        aplicado: true,
        idmandante: idmandante ?? mandanteFilter,
        fechaPago,
      },
      _sum: { monto: true },
    });

    resultado.push({
      periodo: rango.periodo,
      monto: decimalToNumber(agg._sum.monto),
    });
  }

  return resultado;
}
