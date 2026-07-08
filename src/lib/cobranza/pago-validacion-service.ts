import type { Prisma } from '@prisma/client';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';

type Tx = Prisma.TransactionClient;

export async function validarPagoAnticipado(
  tx: Tx,
  params: {
    idprestamo: number;
    monto: number;
    fechaPago: Date;
  },
): Promise<void> {
  const prestamo = await tx.tbl_prestamo.findUnique({
    where: { idprestamo: params.idprestamo },
    select: {
      idmandante: true,
      saldoTotal: true,
      fechaVencimiento: true,
      diasMora: true,
    },
  });
  if (!prestamo) {
    return;
  }

  const contrato = await tx.tbl_contrato_mandante.findFirst({
    where: {
      idmandante: prestamo.idmandante,
      estado: true,
      deletedAt: null,
      fechaInicio: { lte: params.fechaPago },
      OR: [{ fechaFin: null }, { fechaFin: { gte: params.fechaPago } }],
    },
    orderBy: { fechaInicio: 'desc' },
    select: { permitePagoAnticipado: true },
  });

  if (!contrato || contrato.permitePagoAnticipado) {
    return;
  }

  const saldo = Number(prestamo.saldoTotal);
  const nuevoSaldo = saldo - params.monto;
  const liquidaPrestamo = nuevoSaldo <= 0.009;
  const antesDeVencimiento =
    prestamo.fechaVencimiento != null &&
    params.fechaPago < prestamo.fechaVencimiento;

  if (liquidaPrestamo && antesDeVencimiento && prestamo.diasMora === 0) {
    throw new GraphQLValidationError(
      'El contrato del mandante no permite pago anticipado (Ley 842/1061 Art.68).',
    );
  }
}
