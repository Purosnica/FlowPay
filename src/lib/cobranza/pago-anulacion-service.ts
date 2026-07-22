/**
 * Anulación de pagos (soft-delete + reverso si estaba conciliado).
 */

import type { Prisma } from '@prisma/client';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { decimalToNumber } from '@/lib/cobranza/decimal-utils';
import { registrarAuditoria } from '@/lib/cobranza/auditoria-service';
import {
  marcarPagoComoNoAplicadoAtomico,
} from '@/lib/cobranza/pago-aplicacion-service';
import { revertirPagoDelPrestamo } from '@/lib/contexts/liquidacion';
import { puedeAnularPago } from '@/lib/logic/pago-estado-logic';

type Tx = Prisma.TransactionClient;

type PagoAnulable = {
  idpago: number;
  idprestamo: number;
  monto: Prisma.Decimal;
  aplicado: boolean;
  deletedAt: Date | null;
  liquidacionDetalles: Array<{
    liquidacion: { estado: string };
  }>;
};

export function assertPuedeAnularPago(pago: PagoAnulable): void {
  if (!puedeAnularPago(pago)) {
    throw new GraphQLValidationError('El pago ya está anulado.');
  }

  const enLiquidacionInmutable = pago.liquidacionDetalles.some(
    (d) =>
      d.liquidacion.estado === 'EMITIDA' ||
      d.liquidacion.estado === 'PAGADA',
  );
  if (enLiquidacionInmutable) {
    throw new GraphQLValidationError(
      'No se puede anular un pago incluido en una liquidación emitida o pagada.',
    );
  }

  if (pago.liquidacionDetalles.length > 0) {
    throw new GraphQLValidationError(
      'No se puede anular un pago incluido en una liquidación. Regenere o anule el borrador primero.',
    );
  }
}

export async function anularPagoEnTransaccion(
  tx: Tx,
  pago: PagoAnulable,
  idusuario: number | undefined,
): Promise<void> {
  assertPuedeAnularPago(pago);

  const monto = decimalToNumber(pago.monto);

  if (pago.aplicado) {
    const desmarcado = await marcarPagoComoNoAplicadoAtomico(tx, pago.idpago);
    if (desmarcado) {
      await revertirPagoDelPrestamo(tx, {
        idprestamo: pago.idprestamo,
        monto,
        idpago: pago.idpago,
        idusuario,
      });
    }
  }

  await tx.tbl_pago.update({
    where: { idpago: pago.idpago },
    data: { deletedAt: new Date() },
  });

  await registrarAuditoria(tx, {
    idusuario,
    entidad: 'tbl_pago',
    entidadId: pago.idpago,
    accion: 'ANULAR',
    detalle: JSON.stringify({
      idprestamo: pago.idprestamo,
      monto,
      estabaAplicado: pago.aplicado,
    }),
  });
}
