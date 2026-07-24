import { Prisma } from '@prisma/client';
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
import { registrarAuditoria } from './auditoria-service';
import {
  puedeAnularLiquidacion,
  puedeEmitirLiquidacion,
  puedeMarcarLiquidacionPagada,
  puedeRegenerarLiquidacion,
  puedeRevertirLiquidacionPagada,
} from '@/lib/logic/liquidacion-estado-logic';
import {
  convertirMontoAMonedaBase,
  MONEDA_BASE_LIQUIDACION,
} from '@/lib/logic/liquidacion-fx-logic';
import type {
  DetallePagoLiquidacion,
  SimulacionLiquidacion,
} from '@/types/cobranza';

export type { DetallePagoLiquidacion, SimulacionLiquidacion };

export interface GenerarLiquidacionParams {
  idmandante: number;
  periodo: string;
  idusuario: number;
  /** Si se repite con la misma key (mismo mandante), no regenera. */
  idempotencyKey?: string;
}

interface PagoLiquidacionRow {
  idpago: number;
  idprestamo: number;
  fechaPago: Date;
  monto: number;
  montoOriginal: number;
  monedaOriginal: string;
  tipoCambioAplicado: number;
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
      // Misma atribución que reporte de cobranza: gestión → asignado al préstamo.
      // No usar pago.idgestor (quien registró/importó), que distorsiona por gestor.
      gestion: {
        select: {
          idgestor: true,
          gestor: { select: { nombre: true, porcentajeComision: true } },
        },
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
    const idgestor =
      p.gestion?.idgestor ?? p.prestamo.idgestorAsignado ?? null;
    const gestor = p.gestion?.gestor ?? p.prestamo.gestor ?? null;
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

    const fx = convertirMontoAMonedaBase({
      monto: decimalToNumber(p.monto),
      moneda: p.moneda,
      tipoCambio: p.tipoCambio != null ? decimalToNumber(p.tipoCambio) : null,
      monedaBase: MONEDA_BASE_LIQUIDACION,
    });

    return {
      idpago: p.idpago,
      idprestamo: p.idprestamo,
      fechaPago: p.fechaPago,
      monto: fx.montoBase,
      montoOriginal: decimalToNumber(p.monto),
      monedaOriginal: fx.monedaOriginal,
      tipoCambioAplicado: fx.tipoCambioAplicado,
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
      fechaPago: pago.fechaPago.toISOString(),
      monto: pago.monto,
      monedaOriginal: pago.monedaOriginal,
      montoOriginal: pago.montoOriginal,
      tipoCambioAplicado: pago.tipoCambioAplicado,
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
    moneda: MONEDA_BASE_LIQUIDACION,
    totalRecuperado,
    totalIngresoEmpresa,
    totalComision,
    cantidadPagos: detalle.length,
    detalle,
  };
}

async function cargarSimulacionDesdeLiquidacion(
  idliquidacion: number,
): Promise<SimulacionLiquidacion> {
  const liq = await prisma.tbl_liquidacion.findUniqueOrThrow({
    where: { idliquidacion },
    include: {
      detalle: {
        include: {
          pago: { select: { fechaPago: true } },
        },
      },
    },
  });
  const detalle: DetallePagoLiquidacion[] = liq.detalle.map((d) => ({
    idpago: d.idpago,
    idprestamo: d.idprestamo,
    noPrestamo: d.noPrestamo,
    fechaPago: d.pago.fechaPago.toISOString(),
    monto: decimalToNumber(d.monto),
    monedaOriginal: d.monedaOriginal,
    montoOriginal: decimalToNumber(d.montoOriginal),
    tipoCambioAplicado: decimalToNumber(d.tipoCambioAplicado),
    diasMora: d.diasMora,
    idgestor: d.idgestor,
    nombreGestor: d.nombreGestor,
    porcentajeRecuperacion: decimalToNumber(d.porcentajeRecuperacion),
    ingresoEmpresa: decimalToNumber(d.ingresoEmpresa),
    porcentajeComisionCobrador: decimalToNumber(d.porcentajeComisionCobrador),
    montoComision: decimalToNumber(d.montoComision),
  }));
  return {
    idmandante: liq.idmandante,
    periodo: liq.periodo,
    moneda: liq.moneda,
    totalRecuperado: decimalToNumber(liq.totalRecuperado),
    totalIngresoEmpresa: roundMoney(
      detalle.reduce((s, d) => s + d.ingresoEmpresa, 0),
    ),
    totalComision: decimalToNumber(liq.totalComision),
    cantidadPagos: detalle.length,
    detalle,
  };
}

export async function generarLiquidacion(
  params: GenerarLiquidacionParams,
): Promise<{ idliquidacion: number; simulacion: SimulacionLiquidacion }> {
  const key =
    params.idempotencyKey && params.idempotencyKey.trim().length > 0
      ? params.idempotencyKey.trim().slice(0, 64)
      : undefined;

  if (key) {
    await requerirAccesoMandante(params.idusuario, params.idmandante);
    const porKey = await prisma.tbl_liquidacion.findFirst({
      where: {
        idmandante: params.idmandante,
        idempotencyKey: key,
        deletedAt: null,
      },
    });
    if (porKey) {
      return {
        idliquidacion: porKey.idliquidacion,
        simulacion: await cargarSimulacionDesdeLiquidacion(porKey.idliquidacion),
      };
    }
  }

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
    if (key) {
      const race = await prisma.tbl_liquidacion.findFirst({
        where: {
          idmandante: params.idmandante,
          idempotencyKey: key,
          deletedAt: null,
        },
      });
      if (race) {
        return {
          idliquidacion: race.idliquidacion,
          simulacion: await cargarSimulacionDesdeLiquidacion(
            race.idliquidacion,
          ),
        };
      }
    }

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

    if (reutilizable && !puedeRegenerarLiquidacion(reutilizable.estado)) {
      throw new Error(
        `No se puede regenerar una liquidación en estado ${reutilizable.estado}. ` +
          'EMITIDA/PAGADA son inmutables; anule el borrador o cree un periodo nuevo.',
      );
    }

    try {
      const liquidacion = await prisma.$transaction(async (tx) => {
        const liq = reutilizable
          ? await tx.tbl_liquidacion.update({
              where: { idliquidacion: reutilizable.idliquidacion },
              data: {
                totalRecuperado: sim.totalRecuperado,
                totalComision: sim.totalComision,
                moneda: sim.moneda,
                estado: 'BORRADOR',
                idusuarioCreacion: params.idusuario,
                idusuarioEmision: null,
                ...(key ? { idempotencyKey: key } : {}),
              },
            })
          : await tx.tbl_liquidacion.create({
              data: {
                idmandante: params.idmandante,
                periodo: sim.periodo,
                periodoActivo: sim.periodo,
                moneda: sim.moneda,
                totalRecuperado: sim.totalRecuperado,
                totalComision: sim.totalComision,
                estado: 'BORRADOR',
                idusuarioCreacion: params.idusuario,
                idempotencyKey: key,
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
              monedaOriginal: d.monedaOriginal,
              montoOriginal: d.montoOriginal,
              tipoCambioAplicado: d.tipoCambioAplicado,
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

        await registrarAuditoria(tx, {
          idusuario: params.idusuario,
          entidad: 'tbl_liquidacion',
          entidadId: liq.idliquidacion,
          accion: reutilizable ? 'REGENERAR' : 'GENERAR',
          detalle: JSON.stringify({
            periodo: sim.periodo,
            moneda: sim.moneda,
            before: reutilizable
              ? {
                  estado: reutilizable.estado,
                  totalRecuperado: decimalToNumber(
                    reutilizable.totalRecuperado,
                  ),
                  totalComision: decimalToNumber(reutilizable.totalComision),
                }
              : null,
            after: {
              estado: 'BORRADOR',
              totalRecuperado: sim.totalRecuperado,
              totalComision: sim.totalComision,
              cantidadPagos: sim.cantidadPagos,
            },
          }),
        });

        return liq;
      });

      return { idliquidacion: liquidacion.idliquidacion, simulacion: sim };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        key
      ) {
        const dup = await prisma.tbl_liquidacion.findFirst({
          where: {
            idmandante: params.idmandante,
            idempotencyKey: key,
            deletedAt: null,
          },
        });
        if (dup) {
          return {
            idliquidacion: dup.idliquidacion,
            simulacion: await cargarSimulacionDesdeLiquidacion(
              dup.idliquidacion,
            ),
          };
        }
      }
      throw err;
    }
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
  if (liq.estado === 'EMITIDA') {
    return;
  }
  if (!puedeEmitirLiquidacion(liq.estado)) {
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
    if (!actual || actual.deletedAt || !puedeEmitirLiquidacion(actual.estado)) {
      throw new Error('Solo se pueden emitir liquidaciones en estado BORRADOR.');
    }
    await prisma.$transaction(async (tx) => {
      await tx.tbl_liquidacion.update({
        where: { idliquidacion },
        data: {
          estado: 'EMITIDA',
          idusuarioEmision: idusuario,
        },
      });
      await registrarAuditoria(tx, {
        idusuario,
        entidad: 'tbl_liquidacion',
        entidadId: idliquidacion,
        accion: 'EMITIR',
        detalle: JSON.stringify({
          before: {
            estado: actual.estado,
            totalRecuperado: decimalToNumber(actual.totalRecuperado),
            totalComision: decimalToNumber(actual.totalComision),
            idusuarioCreacion: actual.idusuarioCreacion,
          },
          after: {
            estado: 'EMITIDA',
            idusuarioEmision: idusuario,
          },
        }),
      });
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
  if (liq.estado === 'PAGADA') {
    return;
  }
  if (!puedeMarcarLiquidacionPagada(liq.estado)) {
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
    if (
      !actual ||
      actual.deletedAt ||
      !puedeMarcarLiquidacionPagada(actual.estado)
    ) {
      throw new Error('Solo se pueden pagar liquidaciones emitidas.');
    }
    await prisma.$transaction(async (tx) => {
      await tx.tbl_liquidacion.update({
        where: { idliquidacion },
        data: { estado: 'PAGADA' },
      });
      await registrarAuditoria(tx, {
        idusuario,
        entidad: 'tbl_liquidacion',
        entidadId: idliquidacion,
        accion: 'MARCAR_PAGADA',
        detalle: JSON.stringify({
          before: {
            estado: actual.estado,
            totalRecuperado: decimalToNumber(actual.totalRecuperado),
            totalComision: decimalToNumber(actual.totalComision),
            idusuarioEmision: actual.idusuarioEmision,
          },
          after: { estado: 'PAGADA' },
        }),
      });
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
  if (!puedeRevertirLiquidacionPagada(liq.estado)) {
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
    if (
      !actual ||
      actual.deletedAt ||
      !puedeRevertirLiquidacionPagada(actual.estado)
    ) {
      throw new Error(
        'Solo se puede revertir el pago de liquidaciones PAGADA.',
      );
    }
    await prisma.$transaction(async (tx) => {
      await tx.tbl_liquidacion.update({
        where: { idliquidacion },
        data: { estado: 'EMITIDA' },
      });
      await registrarAuditoria(tx, {
        idusuario,
        entidad: 'tbl_liquidacion',
        entidadId: idliquidacion,
        accion: 'REVERTIR_PAGADA',
        detalle: JSON.stringify({
          before: {
            estado: actual.estado,
            totalRecuperado: decimalToNumber(actual.totalRecuperado),
            totalComision: decimalToNumber(actual.totalComision),
          },
          after: { estado: 'EMITIDA' },
        }),
      });
    });
  } finally {
    await liberarBloqueoMysql(lockName);
  }
}

/**
 * Anula (soft-delete) una liquidación en BORRADOR y libera periodoActivo
 * para poder regenerar el mismo periodo.
 * EMITIDA/PAGADA son inmutables (H01).
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
  if (!puedeAnularLiquidacion(liq.estado)) {
    throw new Error(
      `No se puede anular una liquidación en estado ${liq.estado}. ` +
        'Solo BORRADOR es anulable.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.tbl_liquidacion.update({
      where: { idliquidacion },
      data: {
        deletedAt: new Date(),
        periodoActivo: null,
      },
    });
    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'tbl_liquidacion',
      entidadId: idliquidacion,
      accion: 'ANULAR',
      detalle: JSON.stringify({
        before: {
          estado: liq.estado,
          periodo: liq.periodo,
          periodoActivo: liq.periodoActivo,
          totalRecuperado: decimalToNumber(liq.totalRecuperado),
          totalComision: decimalToNumber(liq.totalComision),
        },
        after: {
          deleted: true,
          periodoActivo: null,
        },
      }),
    });
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
    include: {
      pago: { select: { fechaPago: true } },
    },
    orderBy: { iddetalle: 'asc' },
  });

  return rows.map((r) => ({
    idpago: r.idpago,
    idprestamo: r.idprestamo,
    noPrestamo: r.noPrestamo,
    fechaPago: r.pago.fechaPago.toISOString(),
    monto: decimalToNumber(r.monto),
    monedaOriginal: r.monedaOriginal,
    montoOriginal: decimalToNumber(r.montoOriginal),
    tipoCambioAplicado: decimalToNumber(r.tipoCambioAplicado),
    diasMora: r.diasMora,
    idgestor: r.idgestor,
    nombreGestor: r.nombreGestor,
    porcentajeRecuperacion: decimalToNumber(r.porcentajeRecuperacion),
    ingresoEmpresa: decimalToNumber(r.ingresoEmpresa),
    porcentajeComisionCobrador: decimalToNumber(r.porcentajeComisionCobrador),
    montoComision: decimalToNumber(r.montoComision),
  }));
}
