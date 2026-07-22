/**
 * Fuente única de verdad para el cálculo de días de mora.
 * Todo el sistema consume `tbl_prestamo.diasMora` actualizado por este servicio.
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { diferenciaEnDias } from '@/lib/utils/date';
import { decimalToNumber } from './decimal-utils';
import {
  CLAVE_MORA_DIAS_GRACIA,
  obtenerConfigNumerica,
} from './configuracion-cobranza-service';
import { sincronizarEstadoPorMora } from './estado-prestamo-service';
import { evaluarCastigoPrestamo } from './castigo-cartera-service';

type Tx = Prisma.TransactionClient | typeof prisma;

const ESTADOS_SIN_MORA = new Set(['Cancelado', 'Finalizado']);

export interface DatosCalculoDiasMora {
  fechaVencimiento: Date | null;
  ultimaFechaPago: Date | null;
  saldoTotal: number;
  estado: string;
  acuerdoVigente: boolean;
  fechaInicioAcuerdo: Date | null;
  fechaCalculo?: Date;
  diasGracia?: number;
}

export interface ResultadoSincronizacionMora {
  anterior: number;
  nuevo: number;
  actualizado: boolean;
}

function normalizarFecha(fecha: Date): Date {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function fechaHoy(): Date {
  return normalizarFecha(new Date());
}

/**
 * Calcula días de mora a partir de datos del préstamo (función pura).
 *
 * Reglas:
 * - Sin saldo o estados terminales → 0
 * - Con acuerdo vigente → mora congelada al momento del acuerdo
 * - Sin fecha de vencimiento → 0
 * - Referencia: fechaVencimiento; pagos parciales no reinician el conteo
 * - Liquidación total → 0 (saldo <= 0)
 */
export function calcularDiasMora(datos: DatosCalculoDiasMora): number {
  if (datos.saldoTotal <= 0 || ESTADOS_SIN_MORA.has(datos.estado)) {
    return 0;
  }

  if (!datos.fechaVencimiento) {
    return 0;
  }

  const diasGracia = datos.diasGracia ?? 0;
  const fechaCalculo = normalizarFecha(datos.fechaCalculo ?? fechaHoy());
  const fechaVencimiento = normalizarFecha(datos.fechaVencimiento);

  if (fechaCalculo <= fechaVencimiento) {
    return 0;
  }

  if (datos.acuerdoVigente && datos.fechaInicioAcuerdo) {
    const fechaCongelamiento = normalizarFecha(datos.fechaInicioAcuerdo);
    const diasCongelados = diferenciaEnDias(fechaVencimiento, fechaCongelamiento);
    return Math.max(0, diasCongelados - diasGracia);
  }

  const dias = diferenciaEnDias(fechaVencimiento, fechaCalculo);
  return Math.max(0, dias - diasGracia);
}

export async function cargarDatosCalculoMora(
  db: Tx,
  idprestamo: number,
): Promise<(DatosCalculoDiasMora & { diasMora: number }) | null> {
  const prestamo = await db.tbl_prestamo.findUnique({
    where: { idprestamo },
    select: {
      fechaVencimiento: true,
      ultimaFechaPago: true,
      saldoTotal: true,
      estado: true,
      diasMora: true,
    },
  });

  if (!prestamo) {
    return null;
  }

  const acuerdoVigente = await db.tbl_acuerdo.findFirst({
    where: {
      idprestamo,
      estado: 'VIGENTE',
      deletedAt: null,
    },
    select: { fechaInicio: true },
    orderBy: { fechaInicio: 'desc' },
  });

  return {
    fechaVencimiento: prestamo.fechaVencimiento,
    ultimaFechaPago: prestamo.ultimaFechaPago,
    saldoTotal: decimalToNumber(prestamo.saldoTotal),
    estado: prestamo.estado,
    diasMora: prestamo.diasMora,
    acuerdoVigente: acuerdoVigente != null,
    fechaInicioAcuerdo: acuerdoVigente?.fechaInicio ?? null,
  };
}

export async function resolverDiasMoraPrestamo(
  db: Tx,
  idprestamo: number,
  fechaCalculo?: Date,
): Promise<number> {
  const datos = await cargarDatosCalculoMora(db, idprestamo);
  if (!datos) {
    return 0;
  }

  const diasGracia = await obtenerConfigNumerica(CLAVE_MORA_DIAS_GRACIA);
  return calcularDiasMora({
    fechaVencimiento: datos.fechaVencimiento,
    ultimaFechaPago: datos.ultimaFechaPago,
    saldoTotal: datos.saldoTotal,
    estado: datos.estado,
    acuerdoVigente: datos.acuerdoVigente,
    fechaInicioAcuerdo: datos.fechaInicioAcuerdo,
    diasGracia,
    fechaCalculo,
  });
}

/**
 * Recalcula, persiste diasMora y dispara efectos derivados (estado, castigo).
 */
export async function sincronizarMoraPrestamo(
  db: Tx,
  idprestamo: number,
  idusuario?: number | null,
  fechaCalculo?: Date,
): Promise<ResultadoSincronizacionMora> {
  const datos = await cargarDatosCalculoMora(db, idprestamo);
  if (!datos) {
    return { anterior: 0, nuevo: 0, actualizado: false };
  }

  const diasGracia = await obtenerConfigNumerica(CLAVE_MORA_DIAS_GRACIA);
  const nuevo = calcularDiasMora({
    fechaVencimiento: datos.fechaVencimiento,
    ultimaFechaPago: datos.ultimaFechaPago,
    saldoTotal: datos.saldoTotal,
    estado: datos.estado,
    acuerdoVigente: datos.acuerdoVigente,
    fechaInicioAcuerdo: datos.fechaInicioAcuerdo,
    diasGracia,
    fechaCalculo,
  });

  const anterior = datos.diasMora;
  const actualizado = nuevo !== anterior;

  if (actualizado) {
    await db.tbl_prestamo.update({
      where: { idprestamo },
      data: { diasMora: nuevo },
    });
  }

  await sincronizarEstadoPorMora(db, idprestamo, idusuario);
  await evaluarCastigoPrestamo(db, idprestamo, idusuario);

  return { anterior, nuevo, actualizado };
}

import { logger } from '@/lib/utils/logger';
import {
  resumirPerfilMora,
  type MoraBatchProfile,
  type MoraRecalculoProfile,
} from './mora-recalculo-profile';

const BATCH_RECALCULO = 500;
const CONCURRENCIA_RECALCULO = 10;

async function sincronizarLoteMora(
  ids: number[],
): Promise<{ evaluados: number; actualizados: number }> {
  let evaluados = 0;
  let actualizados = 0;

  for (let i = 0; i < ids.length; i += CONCURRENCIA_RECALCULO) {
    const lote = ids.slice(i, i + CONCURRENCIA_RECALCULO);
    const resultados = await Promise.all(
      lote.map((idprestamo) => sincronizarMoraPrestamo(prisma, idprestamo)),
    );
    evaluados += resultados.length;
    actualizados += resultados.filter((r) => r.actualizado).length;
  }

  return { evaluados, actualizados };
}

/**
 * Recalcula mora de todos los préstamos activos con saldo.
 * Invocado por el cron diario de operaciones de cobranza.
 * Incluye profiling por lote para carteras grandes (I114).
 */
export async function procesarRecalculoMoraCartera(
  idmandante?: number,
): Promise<{
  evaluados: number;
  actualizados: number;
  profiling: MoraRecalculoProfile;
}> {
  const samples: MoraBatchProfile[] = [];
  const started = Date.now();
  let evaluados = 0;
  let actualizados = 0;
  let cursor: number | undefined;
  let batchIndex = 0;

  for (;;) {
    const prestamos = await prisma.tbl_prestamo.findMany({
      where: {
        deletedAt: null,
        idmandante: idmandante ?? undefined,
        saldoTotal: { gt: 0 },
        estado: { notIn: ['Cancelado', 'Finalizado'] },
        ...(cursor != null ? { idprestamo: { gt: cursor } } : {}),
      },
      select: { idprestamo: true },
      orderBy: { idprestamo: 'asc' },
      take: BATCH_RECALCULO,
    });

    if (prestamos.length === 0) {
      break;
    }

    const ids = prestamos.map((p) => p.idprestamo);
    const batchStarted = Date.now();
    const lote = await sincronizarLoteMora(ids);
    const durationMs = Date.now() - batchStarted;

    samples.push({
      batchIndex,
      size: lote.evaluados,
      durationMs,
      actualizados: lote.actualizados,
    });

    if (durationMs > 15_000) {
      logger.warn('Lote mora lento', {
        batchIndex,
        size: lote.evaluados,
        durationMs,
        idmandante: idmandante ?? null,
      });
    }

    evaluados += lote.evaluados;
    actualizados += lote.actualizados;
    batchIndex += 1;

    cursor = prestamos[prestamos.length - 1]?.idprestamo;
    if (prestamos.length < BATCH_RECALCULO) {
      break;
    }
  }

  const profiling = resumirPerfilMora(samples, Date.now() - started);
  logger.info('Recálculo mora completado', {
    evaluados,
    actualizados,
    batches: profiling.batches,
    totalMs: profiling.totalMs,
    p95BatchMs: profiling.p95BatchMs,
    maxBatchMs: profiling.maxBatchMs,
  });

  return { evaluados, actualizados, profiling };
}
