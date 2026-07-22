/**
 * Tablas resumen diarias materializadas para centro de inteligencia / reportes.
 */

import { prisma } from '@/lib/prisma';
import { decimalToNumber, roundMoney } from './decimal-utils';
import {
  filtroFechaEnPeriodo,
  rangoMesRelativo,
  rangoPeriodoActual,
} from './periodo-utils';

function inicioDia(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface ResumenDiarioCobranza {
  idmandante: number;
  fecha: Date;
  totalPrestamos: number;
  prestamosEnMora: number;
  saldoCartera: number;
  saldoMora: number;
  gestionesDia: number;
  pagosDia: number;
  montoRecuperadoDia: number;
  promesasVencidas: number;
  acuerdosEnRiesgo: number;
  reclamosFueraSla: number;
  recuperacionMesActual: number;
  recuperacionMesAnterior: number;
}

async function calcularResumenMandante(
  idmandante: number,
  fecha: Date,
): Promise<Omit<ResumenDiarioCobranza, 'idmandante' | 'fecha'>> {
  const diaInicio = inicioDia(fecha);
  const diaFin = new Date(diaInicio);
  diaFin.setDate(diaFin.getDate() + 1);

  const prestamoWhere = {
    deletedAt: null,
    idmandante,
    estado: { notIn: ['Cancelado', 'Finalizado'] },
  };

  const mesActual = filtroFechaEnPeriodo(rangoPeriodoActual());
  const mesAnterior = filtroFechaEnPeriodo(rangoMesRelativo(-1));

  const [
    totalPrestamos,
    prestamosEnMora,
    aggSaldo,
    aggMora,
    gestionesDia,
    pagosDia,
    aggPagosDia,
    promesasVencidas,
    acuerdosEnRiesgo,
    reclamosFueraSla,
    recuperacionActual,
    recuperacionAnterior,
  ] = await Promise.all([
    prisma.tbl_prestamo.count({ where: prestamoWhere }),
    prisma.tbl_prestamo.count({
      where: { ...prestamoWhere, diasMora: { gt: 0 } },
    }),
    prisma.tbl_prestamo.aggregate({
      where: prestamoWhere,
      _sum: { saldoTotal: true },
    }),
    prisma.tbl_prestamo.aggregate({
      where: { ...prestamoWhere, diasMora: { gt: 0 } },
      _sum: { saldoTotal: true },
    }),
    prisma.tbl_gestion.count({
      where: {
        deletedAt: null,
        idmandante,
        fechaGestion: { gte: diaInicio, lt: diaFin },
      },
    }),
    prisma.tbl_pago.count({
      where: {
        deletedAt: null,
        idmandante,
        fechaPago: { gte: diaInicio, lt: diaFin },
      },
    }),
    prisma.tbl_pago.aggregate({
      where: {
        deletedAt: null,
        aplicado: true,
        idmandante,
        fechaPago: { gte: diaInicio, lt: diaFin },
      },
      _sum: { monto: true },
    }),
    prisma.tbl_gestion.count({
      where: {
        deletedAt: null,
        idmandante,
        fechaPromesa: { lt: diaInicio },
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
          idmandante,
        },
      },
    }),
    prisma.tbl_reclamo.count({
      where: {
        deletedAt: null,
        idmandante,
        estado: { in: ['ABIERTO', 'EN_PROCESO'] },
        fechaLimite: { lt: diaInicio },
      },
    }),
    prisma.tbl_pago.aggregate({
      where: {
        deletedAt: null,
        aplicado: true,
        idmandante,
        fechaPago: mesActual,
      },
      _sum: { monto: true },
    }),
    prisma.tbl_pago.aggregate({
      where: {
        deletedAt: null,
        aplicado: true,
        idmandante,
        fechaPago: mesAnterior,
      },
      _sum: { monto: true },
    }),
  ]);

  return {
    totalPrestamos,
    prestamosEnMora,
    saldoCartera: roundMoney(decimalToNumber(aggSaldo._sum.saldoTotal)),
    saldoMora: roundMoney(decimalToNumber(aggMora._sum.saldoTotal)),
    gestionesDia,
    pagosDia,
    montoRecuperadoDia: roundMoney(
      decimalToNumber(aggPagosDia._sum.monto),
    ),
    promesasVencidas,
    acuerdosEnRiesgo,
    reclamosFueraSla,
    recuperacionMesActual: roundMoney(
      decimalToNumber(recuperacionActual._sum.monto),
    ),
    recuperacionMesAnterior: roundMoney(
      decimalToNumber(recuperacionAnterior._sum.monto),
    ),
  };
}

export async function materializarResumenDiarioMandante(
  idmandante: number,
  fecha: Date = new Date(),
): Promise<ResumenDiarioCobranza> {
  const fechaDia = inicioDia(fecha);
  const datos = await calcularResumenMandante(idmandante, fechaDia);

  await prisma.tbl_resumen_diario_cobranza.upsert({
    where: {
      idmandante_fecha: { idmandante, fecha: fechaDia },
    },
    create: {
      idmandante,
      fecha: fechaDia,
      ...datos,
    },
    update: {
      ...datos,
      calculatedAt: new Date(),
    },
  });

  return { idmandante, fecha: fechaDia, ...datos };
}

export async function materializarResumenesDiariosTodos(
  fecha: Date = new Date(),
): Promise<{ mandantes: number; ok: number; errores: number }> {
  const mandantes = await prisma.tbl_mandante.findMany({
    where: { deletedAt: null, estado: true },
    select: { idmandante: true },
  });

  let ok = 0;
  let errores = 0;
  for (const m of mandantes) {
    try {
      await materializarResumenDiarioMandante(m.idmandante, fecha);
      ok++;
    } catch {
      errores++;
    }
  }

  return { mandantes: mandantes.length, ok, errores };
}

export async function obtenerResumenDiarioMaterializado(
  idmandante: number,
  fecha: Date = new Date(),
): Promise<ResumenDiarioCobranza | null> {
  const fechaDia = inicioDia(fecha);
  const row = await prisma.tbl_resumen_diario_cobranza.findUnique({
    where: {
      idmandante_fecha: { idmandante, fecha: fechaDia },
    },
  });
  if (!row) {
    return null;
  }
  return {
    idmandante: row.idmandante,
    fecha: row.fecha,
    totalPrestamos: row.totalPrestamos,
    prestamosEnMora: row.prestamosEnMora,
    saldoCartera: Number(row.saldoCartera),
    saldoMora: Number(row.saldoMora),
    gestionesDia: row.gestionesDia,
    pagosDia: row.pagosDia,
    montoRecuperadoDia: Number(row.montoRecuperadoDia),
    promesasVencidas: row.promesasVencidas,
    acuerdosEnRiesgo: row.acuerdosEnRiesgo,
    reclamosFueraSla: row.reclamosFueraSla,
    recuperacionMesActual: Number(row.recuperacionMesActual),
    recuperacionMesAnterior: Number(row.recuperacionMesAnterior),
  };
}
