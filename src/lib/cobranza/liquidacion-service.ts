import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import {
  calcularComisionPago,
  cargarTramosRecuperacionMandante,
} from './comision-cobro-service';
import {
  cargarMapaComisionCobradorMandante,
  resolverComisionDesdeMapa,
} from './comision-cobrador-service';
import {
  adquirirBloqueoMysql,
  liberarBloqueoMysql,
} from '@/lib/scalability/mysql-advisory-lock';
import type {
  DetallePagoLiquidacion,
  SimulacionLiquidacion,
} from '@/types/cobranza';

export type { DetallePagoLiquidacion, SimulacionLiquidacion };

export interface GenerarLiquidacionParams {
  idmandante: number;
  periodo: string;
  idusuario: number;
}

interface PagoLiquidacionRow {
  idpago: number;
  idprestamo: number;
  monto: number;
  noPrestamo: string;
  diasMora: number;
  idgestor: number | null;
  nombreGestor: string | null;
  porcentajeComisionCobrador: number;
}

/**
 * Resuelve mora al momento del pago: snapshot → corte ≤ fechaPago → mora actual.
 */
function resolverDiasMoraDesdeCortes(
  idprestamo: number,
  fechaPago: Date,
  cortesPorPrestamo: Map<
    number,
    Array<{ fechaCorte: Date; diasMora: number }>
  >,
  diasMoraActual: number,
): number {
  const cortes = cortesPorPrestamo.get(idprestamo);
  if (!cortes || cortes.length === 0) {
    return diasMoraActual;
  }
  for (const corte of cortes) {
    if (corte.fechaCorte.getTime() <= fechaPago.getTime()) {
      return corte.diasMora;
    }
  }
  return diasMoraActual;
}

async function cargarPagosPeriodo(
  idmandante: number,
  inicio: Date,
  fin: Date,
  mapaComision: Map<number, number | null>,
): Promise<PagoLiquidacionRow[]> {
  const pagos = await prisma.tbl_pago.findMany({
    where: {
      idmandante,
      deletedAt: null,
      aplicado: true,
      fechaPago: { gte: inicio, lt: fin },
    },
    include: {
      prestamo: {
        select: {
          noPrestamo: true,
          diasMora: true,
          idgestorAsignado: true,
          gestor: { select: { nombre: true, porcentajeComision: true } },
        },
      },
      gestor: {
        select: { nombre: true, porcentajeComision: true },
      },
    },
    orderBy: { fechaPago: 'asc' },
  });

  const idsSinSnapshot = [
    ...new Set(
      pagos
        .filter((p) => p.diasMoraAplicacion == null)
        .map((p) => p.idprestamo),
    ),
  ];

  const cortesPorPrestamo = new Map<
    number,
    Array<{ fechaCorte: Date; diasMora: number }>
  >();

  if (idsSinSnapshot.length > 0) {
    const cortes = await prisma.tbl_prestamo_corte.findMany({
      where: { idprestamo: { in: idsSinSnapshot } },
      select: { idprestamo: true, fechaCorte: true, diasMora: true },
      orderBy: { fechaCorte: 'desc' },
    });
    for (const corte of cortes) {
      const lista = cortesPorPrestamo.get(corte.idprestamo) ?? [];
      lista.push({
        fechaCorte: corte.fechaCorte,
        diasMora: corte.diasMora,
      });
      cortesPorPrestamo.set(corte.idprestamo, lista);
    }
  }

  return pagos.map((p) => {
    const gestorRegistro = p.gestor;
    const gestorPrestamo = p.prestamo.gestor;
    const idgestor = p.idgestor ?? p.prestamo.idgestorAsignado;
    const gestor = gestorRegistro ?? gestorPrestamo;
    const porcentajeUsuario = gestor
      ? decimalToNumber(gestor.porcentajeComision)
      : 0;

    const diasMora =
      p.diasMoraAplicacion ??
      resolverDiasMoraDesdeCortes(
        p.idprestamo,
        p.fechaPago,
        cortesPorPrestamo,
        p.prestamo.diasMora,
      );

    return {
      idpago: p.idpago,
      idprestamo: p.idprestamo,
      monto: decimalToNumber(p.monto),
      noPrestamo: p.prestamo.noPrestamo,
      diasMora,
      idgestor,
      nombreGestor: gestor?.nombre ?? null,
      porcentajeComisionCobrador: resolverComisionDesdeMapa(
        mapaComision,
        idgestor,
        porcentajeUsuario,
      ),
    };
  });
}

export async function simularLiquidacion(
  idmandante: number,
  periodo: string,
  idusuario: number,
): Promise<SimulacionLiquidacion> {
  await requerirAccesoMandante(idusuario, idmandante);
  const { inicio, fin, periodo: p } = parsePeriodo(periodo);

  const [tramosRecuperacion, mapaComision] = await Promise.all([
    cargarTramosRecuperacionMandante(idmandante),
    cargarMapaComisionCobradorMandante(idmandante),
  ]);
  const pagos = await cargarPagosPeriodo(
    idmandante,
    inicio,
    fin,
    mapaComision,
  );

  const detalle: DetallePagoLiquidacion[] = pagos.map((pago) => {
    const resultado = calcularComisionPago(
      pago.monto,
      pago.diasMora,
      tramosRecuperacion,
      pago.porcentajeComisionCobrador,
    );
    return {
      idpago: pago.idpago,
      idprestamo: pago.idprestamo,
      noPrestamo: pago.noPrestamo,
      monto: pago.monto,
      diasMora: pago.diasMora,
      idgestor: pago.idgestor,
      nombreGestor: pago.nombreGestor,
      porcentajeRecuperacion: resultado.porcentajeRecuperacion,
      ingresoEmpresa: resultado.ingresoEmpresa,
      porcentajeComisionCobrador: resultado.porcentajeComisionCobrador,
      montoComision: resultado.montoComision,
    };
  });

  const totalRecuperado = roundMoney(
    detalle.reduce((s, d) => s + d.monto, 0),
  );
  const totalIngresoEmpresa = roundMoney(
    detalle.reduce((s, d) => s + d.ingresoEmpresa, 0),
  );
  const totalComision = roundMoney(
    detalle.reduce((s, d) => s + d.montoComision, 0),
  );

  return {
    idmandante,
    periodo: p,
    totalRecuperado,
    totalIngresoEmpresa,
    totalComision,
    cantidadPagos: detalle.length,
    detalle,
  };
}

export async function generarLiquidacion(
  params: GenerarLiquidacionParams,
): Promise<{ idliquidacion: number; simulacion: SimulacionLiquidacion }> {
  const sim = await simularLiquidacion(
    params.idmandante,
    params.periodo,
    params.idusuario,
  );

  const lockName = `liq:${params.idmandante}:${sim.periodo}`;
  const locked = await adquirirBloqueoMysql(lockName, 10);
  if (!locked) {
    throw new Error(
      'Otra liquidación del mismo periodo está en proceso. Intente de nuevo.',
    );
  }

  try {
    // Unique: (idmandante, periodoActivo). Regenerar debe permitir
    // anexar pagos y volver a liquidar el mismo periodo.
    const existente = await prisma.tbl_liquidacion.findFirst({
      where: {
        idmandante: params.idmandante,
        periodoActivo: sim.periodo,
      },
    });

    if (existente?.deletedAt) {
      // Inconsistencia: soft-delete sin liberar periodoActivo.
      await prisma.tbl_liquidacion.update({
        where: { idliquidacion: existente.idliquidacion },
        data: { periodoActivo: null },
      });
    }

    const reutilizable =
      existente && !existente.deletedAt ? existente : null;

    const liquidacion = await prisma.$transaction(async (tx) => {
      const liq = reutilizable
        ? await tx.tbl_liquidacion.update({
            where: { idliquidacion: reutilizable.idliquidacion },
            data: {
              totalRecuperado: sim.totalRecuperado,
              totalComision: sim.totalComision,
              // Reabrir a borrador si estaba emitida/pagada:
              // permite anexar pagos y volver a liquidar.
              estado: 'BORRADOR',
            },
          })
        : await tx.tbl_liquidacion.create({
            data: {
              idmandante: params.idmandante,
              periodo: sim.periodo,
              periodoActivo: sim.periodo,
              totalRecuperado: sim.totalRecuperado,
              totalComision: sim.totalComision,
              estado: 'BORRADOR',
            },
          });

      await tx.tbl_liquidacion_detalle.deleteMany({
        where: { idliquidacion: liq.idliquidacion },
      });

      if (sim.detalle.length > 0) {
        await tx.tbl_liquidacion_detalle.createMany({
          data: sim.detalle.map((d) => ({
            idliquidacion: liq.idliquidacion,
            idpago: d.idpago,
            idprestamo: d.idprestamo,
            noPrestamo: d.noPrestamo,
            monto: d.monto,
            diasMora: d.diasMora,
            idgestor: d.idgestor,
            nombreGestor: d.nombreGestor,
            porcentajeRecuperacion: d.porcentajeRecuperacion,
            ingresoEmpresa: d.ingresoEmpresa,
            porcentajeComisionCobrador: d.porcentajeComisionCobrador,
            montoComision: d.montoComision,
          })),
        });
      }

      return liq;
    });

    return { idliquidacion: liquidacion.idliquidacion, simulacion: sim };
  } finally {
    await liberarBloqueoMysql(lockName);
  }
}

export async function emitirLiquidacion(
  idliquidacion: number,
  idusuario: number,
): Promise<void> {
  const liq = await prisma.tbl_liquidacion.findUnique({
    where: { idliquidacion },
  });
  if (!liq || liq.deletedAt) {
    throw new Error('Liquidación no encontrada.');
  }
  await requerirAccesoMandante(idusuario, liq.idmandante);
  if (liq.estado !== 'BORRADOR') {
    throw new Error('Solo se pueden emitir liquidaciones en estado BORRADOR.');
  }

  const lockName = `liq-emit:${idliquidacion}`;
  const locked = await adquirirBloqueoMysql(lockName, 5);
  if (!locked) {
    throw new Error(
      'La liquidación está siendo modificada. Intente de nuevo.',
    );
  }
  try {
    const actual = await prisma.tbl_liquidacion.findUnique({
      where: { idliquidacion },
    });
    if (!actual || actual.deletedAt || actual.estado !== 'BORRADOR') {
      throw new Error('Solo se pueden emitir liquidaciones en estado BORRADOR.');
    }
    await prisma.tbl_liquidacion.update({
      where: { idliquidacion },
      data: { estado: 'EMITIDA' },
    });
  } finally {
    await liberarBloqueoMysql(lockName);
  }
}

export async function marcarLiquidacionPagada(
  idliquidacion: number,
  idusuario: number,
): Promise<void> {
  const liq = await prisma.tbl_liquidacion.findUnique({
    where: { idliquidacion },
  });
  if (!liq || liq.deletedAt) {
    throw new Error('Liquidación no encontrada.');
  }
  await requerirAccesoMandante(idusuario, liq.idmandante);
  if (liq.estado !== 'EMITIDA') {
    throw new Error('Solo se pueden pagar liquidaciones emitidas.');
  }

  const lockName = `liq-pagar:${idliquidacion}`;
  const locked = await adquirirBloqueoMysql(lockName, 5);
  if (!locked) {
    throw new Error(
      'La liquidación está siendo modificada. Intente de nuevo.',
    );
  }
  try {
    const actual = await prisma.tbl_liquidacion.findUnique({
      where: { idliquidacion },
    });
    if (!actual || actual.deletedAt || actual.estado !== 'EMITIDA') {
      throw new Error('Solo se pueden pagar liquidaciones emitidas.');
    }
    await prisma.tbl_liquidacion.update({
      where: { idliquidacion },
      data: { estado: 'PAGADA' },
    });
  } finally {
    await liberarBloqueoMysql(lockName);
  }
}

/**
 * Revierte PAGADA → EMITIDA (deshacer marcar pagada por error).
 */
export async function revertirLiquidacionPagada(
  idliquidacion: number,
  idusuario: number,
): Promise<void> {
  const liq = await prisma.tbl_liquidacion.findUnique({
    where: { idliquidacion },
  });
  if (!liq || liq.deletedAt) {
    throw new Error('Liquidación no encontrada.');
  }
  await requerirAccesoMandante(idusuario, liq.idmandante);
  if (liq.estado !== 'PAGADA') {
    throw new Error('Solo se puede revertir el pago de liquidaciones PAGADA.');
  }

  const lockName = `liq-revertir-pago:${idliquidacion}`;
  const locked = await adquirirBloqueoMysql(lockName, 5);
  if (!locked) {
    throw new Error(
      'La liquidación está siendo modificada. Intente de nuevo.',
    );
  }
  try {
    const actual = await prisma.tbl_liquidacion.findUnique({
      where: { idliquidacion },
    });
    if (!actual || actual.deletedAt || actual.estado !== 'PAGADA') {
      throw new Error(
        'Solo se puede revertir el pago de liquidaciones PAGADA.',
      );
    }
    await prisma.tbl_liquidacion.update({
      where: { idliquidacion },
      data: { estado: 'EMITIDA' },
    });
  } finally {
    await liberarBloqueoMysql(lockName);
  }
}

/**
 * Anula (soft-delete) una liquidación y libera periodoActivo
 * para poder regenerar el mismo periodo.
 * Permite BORRADOR, EMITIDA y PAGADA.
 */
export async function anularLiquidacionBorrador(
  idliquidacion: number,
  idusuario: number,
): Promise<void> {
  const liq = await prisma.tbl_liquidacion.findUnique({
    where: { idliquidacion },
  });
  if (!liq || liq.deletedAt) {
    throw new Error('Liquidación no encontrada.');
  }
  await requerirAccesoMandante(idusuario, liq.idmandante);
  const estadosAnulables = ['BORRADOR', 'EMITIDA', 'PAGADA'];
  if (!estadosAnulables.includes(liq.estado)) {
    throw new Error(
      `No se puede anular una liquidación en estado ${liq.estado}.`,
    );
  }

  await prisma.tbl_liquidacion.update({
    where: { idliquidacion },
    data: {
      deletedAt: new Date(),
      periodoActivo: null,
    },
  });
}

export async function obtenerDetalleLiquidacion(
  idliquidacion: number,
  idusuario: number,
): Promise<DetallePagoLiquidacion[]> {
  const liq = await prisma.tbl_liquidacion.findUnique({
    where: { idliquidacion },
  });
  if (!liq || liq.deletedAt) {
    throw new Error('Liquidación no encontrada.');
  }
  await requerirAccesoMandante(idusuario, liq.idmandante);

  const rows = await prisma.tbl_liquidacion_detalle.findMany({
    where: { idliquidacion },
    orderBy: { iddetalle: 'asc' },
  });

  return rows.map((r) => ({
    idpago: r.idpago,
    idprestamo: r.idprestamo,
    noPrestamo: r.noPrestamo,
    monto: decimalToNumber(r.monto),
    diasMora: r.diasMora,
    idgestor: r.idgestor,
    nombreGestor: r.nombreGestor,
    porcentajeRecuperacion: decimalToNumber(r.porcentajeRecuperacion),
    ingresoEmpresa: decimalToNumber(r.ingresoEmpresa),
    porcentajeComisionCobrador: decimalToNumber(r.porcentajeComisionCobrador),
    montoComision: decimalToNumber(r.montoComision),
  }));
}
