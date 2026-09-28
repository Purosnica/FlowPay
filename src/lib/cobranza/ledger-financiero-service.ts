import type { Prisma } from '@prisma/client';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { finDiaEnZona } from '@/lib/utils/timezone';

type Tx = Prisma.TransactionClient;

export const TIPOS_MOVIMIENTO_FINANCIERO = [
  'SALDO_INICIAL_MIGRADO', 'PAGO', 'REVERSO_PAGO', 'DESCUENTO',
  'CONDONACION', 'CASTIGO', 'AJUSTE_DEBITO', 'AJUSTE_CREDITO',
  'CORRECCION_MIGRACION', 'REFINANCIAMIENTO',
] as const;

export async function registrarMovimientoFinanciero(
  tx: Tx,
  input: {
    idmandante: number; idprestamo: number; idcliente: number; tipoMovimiento: string;
    monto: number; moneda: string; impactoSaldo: number; saldoAnterior: number;
    fechaOperacion: Date; idpago?: number | null; idacuerdo?: number | null;
    creadoPor?: number | null; motivo?: string | null; metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const saldoPosterior = roundMoney(input.saldoAnterior + input.impactoSaldo);
  if (saldoPosterior < -0.001) {
    throw new GraphQLValidationError('El movimiento produciría un saldo negativo.');
  }
  await tx.tbl_movimiento_financiero.create({
    data: {
      ...input,
      monto: roundMoney(input.monto), montoBase: roundMoney(input.monto), monedaBase: input.moneda,
      impactoSaldo: roundMoney(input.impactoSaldo), saldoAnterior: roundMoney(input.saldoAnterior), saldoPosterior,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function obtenerSaldoAlCorte(
  tx: Tx, idprestamo: number, fecha: Date,
): Promise<number> {
  const movimientos = await tx.tbl_movimiento_financiero.aggregate({
    where: { idprestamo, fechaOperacion: { lt: finDiaEnZona(fecha) } },
    _sum: { impactoSaldo: true },
  });
  return roundMoney(decimalToNumber(movimientos._sum.impactoSaldo));
}

export async function calcularSaldoLedger(
  tx: Tx,
  idprestamo: number,
): Promise<number> {
  const movimientos = await tx.tbl_movimiento_financiero.aggregate({
    where: { idprestamo },
    _sum: { impactoSaldo: true },
  });
  return roundMoney(decimalToNumber(movimientos._sum.impactoSaldo));
}

export async function validarSaldoPrestamo(
  tx: Tx,
  idprestamo: number,
): Promise<{ saldoPersistido: number; saldoLedger: number; diferencia: number; ok: boolean }> {
  const prestamo = await tx.tbl_prestamo.findUnique({
    where: { idprestamo }, select: { saldoTotal: true },
  });
  if (!prestamo) throw new GraphQLValidationError('Préstamo no encontrado.');
  const saldoPersistido = roundMoney(decimalToNumber(prestamo.saldoTotal));
  const saldoLedger = await calcularSaldoLedger(tx, idprestamo);
  const diferencia = roundMoney(saldoPersistido - saldoLedger);
  return { saldoPersistido, saldoLedger, diferencia, ok: diferencia === 0 };
}
