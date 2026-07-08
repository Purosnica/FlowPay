import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { filtroMandante, requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { obtenerReporteAgingCartera } from './aging-cartera-service';
import { diasMoraEnTramo } from './tramos-mora';
import type {
  CentroInteligenciaResumen,
  InsightAutomatico,
} from '@/types/cobranza';

export type { CentroInteligenciaResumen, InsightAutomatico };

async function calcularRecuperacionMes(
  idmandante: number | undefined,
  mandanteFilter: Prisma.IntFilter | undefined,
): Promise<{ actual: number; anterior: number }> {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const whereBase = {
    deletedAt: null,
    aplicado: true,
    idmandante: idmandante ?? mandanteFilter,
  };

  const [actual, anterior] = await Promise.all([
    prisma.tbl_pago.aggregate({
      where: { ...whereBase, fechaPago: { gte: inicioMes } },
      _sum: { monto: true },
    }),
    prisma.tbl_pago.aggregate({
      where: {
        ...whereBase,
        fechaPago: { gte: inicioMesAnterior, lt: finMesAnterior },
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
  if (idmandante) {
    const aging = await obtenerReporteAgingCartera(idmandante, idusuario);
    const tramoAlto = aging.tramos.find((t) => t.tramoMoraMin >= 121);
    pctTramoAlto = tramoAlto?.porcentajeSaldo ?? 0;
  } else {
    const prestamos = await prisma.tbl_prestamo.findMany({
      where: { ...prestamoWhere, saldoTotal: { gt: 0 } },
      select: { diasMora: true, saldoTotal: true },
    });
    const saldoTotal = prestamos.reduce(
      (s, p) => s + decimalToNumber(p.saldoTotal),
      0,
    );
    const saldoAlto = prestamos
      .filter((p) => diasMoraEnTramo(p.diasMora, 121, null))
      .reduce((s, p) => s + decimalToNumber(p.saldoTotal), 0);
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

  const insights: InsightAutomatico[] = [];

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
      descripcion: `${pctTramoAlto}% del saldo está en tramo 121+ días.`,
      accionSugerida: 'Evaluar estrategia de negociación o reasignación especializada.',
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
      descripcion: 'No se detectaron alertas críticas en los indicadores principales.',
    });
  }

  return {
    saludCartera,
    recuperacionMes: recuperacion.actual,
    variacionRecuperacionPct,
    prestamosEnMoraPct,
    promesasVencidas,
    acuerdosEnRiesgo,
    reclamosFueraSla,
    insights,
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
  const ahora = new Date();

  for (let i = meses - 1; i >= 0; i--) {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 1);
    const periodo = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}`;

    const agg = await prisma.tbl_pago.aggregate({
      where: {
        deletedAt: null,
        aplicado: true,
        idmandante: idmandante ?? mandanteFilter,
        fechaPago: { gte: inicio, lt: fin },
      },
      _sum: { monto: true },
    });

    resultado.push({
      periodo,
      monto: decimalToNumber(agg._sum.monto),
    });
  }

  return resultado;
}
