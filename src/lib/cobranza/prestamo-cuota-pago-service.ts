/**
 * Aplica / revierte pagos sobre el plan de cuotas del préstamo (H11).
 */

import type { Prisma } from '@prisma/client';
import { decimalToNumber } from './decimal-utils';
import {
  calcularAbonoPlanCuotas,
  revertirAbonosPlanCuotas,
} from '@/lib/logic/prestamo-cuota-pago-logic';
import type { AbonoCuotaSnapshot } from '@/lib/logic/pago-waterfall-logic';

type Tx = Prisma.TransactionClient;

export async function aplicarPagoAPlanCuotas(
  tx: Tx,
  params: { idprestamo: number; monto: number },
): Promise<AbonoCuotaSnapshot[]> {
  const cuotas = await tx.tbl_prestamo_cuota.findMany({
    where: {
      idprestamo: params.idprestamo,
      deletedAt: null,
      estado: { in: ['PENDIENTE', 'VENCIDA'] },
    },
    orderBy: { numero: 'asc' },
    select: {
      idcuota: true,
      numero: true,
      saldo: true,
      estado: true,
    },
  });

  if (cuotas.length === 0) {
    return [];
  }

  const abonos = calcularAbonoPlanCuotas(
    cuotas.map((c) => ({
      idcuota: c.idcuota,
      numero: c.numero,
      saldo: decimalToNumber(c.saldo),
      estado: c.estado,
    })),
    params.monto,
  );

  const snapshot: AbonoCuotaSnapshot[] = [];
  for (const abono of abonos) {
    await tx.tbl_prestamo_cuota.update({
      where: { idcuota: abono.idcuota },
      data: {
        saldo: abono.saldoNuevo,
        estado: abono.estadoNuevo,
      },
    });
    snapshot.push({ idcuota: abono.idcuota, monto: abono.montoAplicado });
  }
  return snapshot;
}

export async function revertirPagoDePlanCuotas(
  tx: Tx,
  abonos: AbonoCuotaSnapshot[],
): Promise<void> {
  for (const abono of abonos) {
    const cuota = await tx.tbl_prestamo_cuota.findUnique({
      where: { idcuota: abono.idcuota },
      select: {
        saldo: true,
        monto: true,
        estado: true,
        deletedAt: true,
      },
    });
    if (!cuota || cuota.deletedAt) {
      continue;
    }
    const next = revertirAbonosPlanCuotas({
      saldoActual: decimalToNumber(cuota.saldo),
      montoRevertir: abono.monto,
      montoCuota: decimalToNumber(cuota.monto),
      estadoActual: cuota.estado,
    });
    await tx.tbl_prestamo_cuota.update({
      where: { idcuota: abono.idcuota },
      data: {
        saldo: next.saldoNuevo,
        estado: next.estadoNuevo,
      },
    });
  }
}
