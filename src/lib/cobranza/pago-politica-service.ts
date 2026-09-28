import type { Prisma } from '@prisma/client';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { esFechaFuturaNegocio } from '@/lib/utils/timezone';

type Tx = Prisma.TransactionClient;

const DINERO_ESCALA = 2;
const FX_ESCALA = 4;

function tieneEscalaValida(valor: number, escala: number): boolean {
  if (!Number.isFinite(valor) || valor <= 0) return false;
  const factor = 10 ** escala;
  return Number.isInteger(Math.round(valor * factor)) &&
    Math.abs(valor * factor - Math.round(valor * factor)) < 1e-8;
}

/** Reglas de dinero y moneda que deben cumplirse antes de registrar o aplicar un pago. */
export async function validarPoliticaPago(
  tx: Tx,
  params: { idprestamo: number; monto: number; moneda: string; tipoCambio?: number | null; fechaPago: Date },
): Promise<void> {
  if (!tieneEscalaValida(params.monto, DINERO_ESCALA)) {
    throw new GraphQLValidationError('El monto debe ser positivo y tener como máximo 2 decimales.');
  }
  if (params.tipoCambio != null && !tieneEscalaValida(params.tipoCambio, FX_ESCALA)) {
    throw new GraphQLValidationError('El tipo de cambio debe ser positivo y tener como máximo 4 decimales.');
  }
  if (esFechaFuturaNegocio(params.fechaPago)) {
    throw new GraphQLValidationError('No se permiten pagos con fecha futura de negocio.');
  }
  const prestamo = await tx.tbl_prestamo.findUnique({
    where: { idprestamo: params.idprestamo },
    select: { moneda: true, deletedAt: true },
  });
  if (!prestamo || prestamo.deletedAt) {
    throw new GraphQLValidationError('Préstamo no encontrado.');
  }
  // No existe una fuente FX confiable/versionada todavía; bloquear antes de afectar saldo.
  if (prestamo.moneda !== params.moneda) {
    throw new GraphQLValidationError(
      `Pago en ${params.moneda} no permitido para préstamo en ${prestamo.moneda} hasta configurar una política FX auditada.`,
    );
  }
  if (params.tipoCambio != null && params.tipoCambio !== 1) {
    throw new GraphQLValidationError('No indique tipo de cambio cuando el pago y el préstamo tienen la misma moneda.');
  }
}
