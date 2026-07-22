/**
 * Aplica pagos conciliados al saldo del préstamo y evalúa cumplimiento de acuerdos.
 */

import type { Prisma } from '@prisma/client';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { sincronizarEstadoPorSaldo } from './estado-prestamo-service';
import { sincronizarMoraPrestamo } from './dias-mora-service';
import { evaluarPromesaPorPago } from './promesa-evaluacion-service';
import {
  evaluarCuotasAcuerdo,
  marcarCuotaPagadaPorMonto,
  revertirCuotasPorPago,
} from './acuerdo-cuota-service';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { incrementarVersionPrestamo } from './optimistic-lock';

type Tx = Prisma.TransactionClient;

const TOLERANCIA_SALDO = 0.009;

export async function aplicarPagoAlPrestamo(
  tx: Tx,
  params: {
    idprestamo: number;
    monto: number;
    fechaPago: Date;
    idacuerdo?: number | null;
    idpago?: number | null;
    idusuario?: number | null;
  },
): Promise<void> {
  const monto = roundMoney(params.monto);
  if (monto <= 0) {
    throw new GraphQLValidationError('El monto del pago debe ser positivo.');
  }

  const prestamo = await tx.tbl_prestamo.findUnique({
    where: { idprestamo: params.idprestamo },
    select: {
      idprestamo: true,
      saldoTotal: true,
      diasMora: true,
      deletedAt: true,
      version: true,
    },
  });

  if (!prestamo || prestamo.deletedAt) {
    throw new GraphQLValidationError('Préstamo no encontrado.');
  }

  const saldoActual = decimalToNumber(prestamo.saldoTotal);
  if (monto > saldoActual + TOLERANCIA_SALDO) {
    throw new GraphQLValidationError(
      `El monto (${monto}) excede el saldo del préstamo (${saldoActual}).`,
    );
  }

  await incrementarVersionPrestamo(tx, params.idprestamo, prestamo.version);

  // Decremento atómico: evita lost updates en pagos concurrentes.
  const afectados = await tx.$executeRaw`
    UPDATE tbl_prestamo
    SET
      saldoTotal = ROUND(saldoTotal - ${monto}, 2),
      ultimaFechaPago = ${params.fechaPago}
    WHERE idprestamo = ${params.idprestamo}
      AND deletedAt IS NULL
      AND saldoTotal >= ${monto - TOLERANCIA_SALDO}
  `;

  if (Number(afectados) === 0) {
    throw new GraphQLValidationError(
      'No se pudo aplicar el pago: saldo insuficiente o préstamo no disponible.',
    );
  }

  if (params.idpago) {
    await tx.tbl_pago.update({
      where: { idpago: params.idpago },
      data: { diasMoraAplicacion: prestamo.diasMora },
    });
  }

  await sincronizarMoraPrestamo(tx, params.idprestamo, params.idusuario);
  await sincronizarEstadoPorSaldo(tx, params.idprestamo, params.idusuario);

  if (params.idpago) {
    await evaluarPromesaPorPago(tx, {
      idprestamo: params.idprestamo,
      montoPago: monto,
      fechaPago: params.fechaPago,
      idusuario: params.idusuario,
    });
  }

  const idacuerdo =
    params.idacuerdo ??
    (
      await tx.tbl_acuerdo.findFirst({
        where: {
          idprestamo: params.idprestamo,
          estado: 'VIGENTE',
          deletedAt: null,
        },
      })
    )?.idacuerdo;

  if (idacuerdo && params.idpago) {
    // Vincular pago al acuerdo para acumular abonos y evaluar cumplimiento.
    await tx.tbl_pago.update({
      where: { idpago: params.idpago },
      data: { idacuerdo },
    });
    await marcarCuotaPagadaPorMonto(tx, idacuerdo, monto, params.idpago);
  }

  if (idacuerdo) {
    await evaluarCumplimientoAcuerdo(tx, idacuerdo, params.idusuario);
    await evaluarCuotasAcuerdo(tx, idacuerdo, params.idusuario);
  }
}

export async function revertirPagoDelPrestamo(
  tx: Tx,
  params: {
    idprestamo: number;
    monto: number;
    idpago?: number | null;
    idusuario?: number | null;
  },
): Promise<void> {
  const monto = roundMoney(params.monto);
  if (monto <= 0) {
    throw new GraphQLValidationError('El monto a revertir debe ser positivo.');
  }

  const prestamo = await tx.tbl_prestamo.findUnique({
    where: { idprestamo: params.idprestamo },
    select: { idprestamo: true, deletedAt: true },
  });

  if (!prestamo || prestamo.deletedAt) {
    throw new GraphQLValidationError('Préstamo no encontrado.');
  }

  const afectados = await tx.$executeRaw`
    UPDATE tbl_prestamo
    SET saldoTotal = ROUND(saldoTotal + ${monto}, 2)
    WHERE idprestamo = ${params.idprestamo}
      AND deletedAt IS NULL
  `;

  if (Number(afectados) === 0) {
    throw new GraphQLValidationError(
      'No se pudo revertir el pago: préstamo no disponible.',
    );
  }

  if (params.idpago) {
    await revertirCuotasPorPago(tx, params.idpago, params.idusuario);
    await tx.tbl_pago.update({
      where: { idpago: params.idpago },
      data: { diasMoraAplicacion: null },
    });
  }

  await sincronizarMoraPrestamo(tx, params.idprestamo, params.idusuario);
  await sincronizarEstadoPorSaldo(tx, params.idprestamo, params.idusuario);
}

export async function evaluarCumplimientoAcuerdo(
  tx: Tx,
  idacuerdo: number,
  idusuario?: number | null,
): Promise<void> {
  const acuerdo = await tx.tbl_acuerdo.findUnique({
    where: { idacuerdo },
  });

  if (!acuerdo || acuerdo.estado !== 'VIGENTE') {
    return;
  }

  const pagosAplicados = await tx.tbl_pago.aggregate({
    where: {
      idacuerdo,
      aplicado: true,
      deletedAt: null,
    },
    _sum: { monto: true },
  });

  const totalPagado = decimalToNumber(pagosAplicados._sum.monto);
  const montoAcordado = decimalToNumber(acuerdo.montoAcordado);

  if (totalPagado >= montoAcordado) {
    await tx.tbl_acuerdo.update({
      where: { idacuerdo },
      data: { estado: 'CUMPLIDO' },
    });

    const otroVigente = await tx.tbl_acuerdo.findFirst({
      where: {
        idprestamo: acuerdo.idprestamo,
        estado: 'VIGENTE',
        deletedAt: null,
        idacuerdo: { not: idacuerdo },
      },
    });

    if (!otroVigente) {
      await tx.tbl_prestamo.update({
        where: { idprestamo: acuerdo.idprestamo },
        data: { reportableCentralRiesgo: true },
      });
    }

    await sincronizarEstadoPorSaldo(tx, acuerdo.idprestamo, idusuario);
  }
}

/** Marca un pago como aplicado de forma condicional (anti doble-aplicación). */
export async function marcarPagoComoAplicadoAtomico(
  tx: Tx,
  idpago: number,
  extra?: { idacuerdo?: number | null },
): Promise<boolean> {
  // Unchecked: updateMany no admite FKs en UpdateManyMutationInput.
  const data: Prisma.tbl_pagoUncheckedUpdateManyInput = {
    aplicado: true,
  };
  if (extra?.idacuerdo != null) {
    data.idacuerdo = extra.idacuerdo;
  }

  const result = await tx.tbl_pago.updateMany({
    where: { idpago, aplicado: false, deletedAt: null },
    data,
  });
  return result.count === 1;
}

/** Marca un pago como no aplicado de forma condicional. */
export async function marcarPagoComoNoAplicadoAtomico(
  tx: Tx,
  idpago: number,
): Promise<boolean> {
  const result = await tx.tbl_pago.updateMany({
    where: { idpago, aplicado: true, deletedAt: null },
    data: { aplicado: false },
  });
  return result.count === 1;
}
