/**
 * Estados operativos de un pago (derivados de aplicado + deletedAt).
 */

export const ESTADOS_PAGO = {
  PENDIENTE: 'PENDIENTE',
  CONCILIADO: 'CONCILIADO',
  ANULADO: 'ANULADO',
} as const;

export type EstadoPago = (typeof ESTADOS_PAGO)[keyof typeof ESTADOS_PAGO];

export function resolverEstadoPago(pago: {
  aplicado: boolean;
  deletedAt?: Date | string | null;
}): EstadoPago {
  if (pago.deletedAt != null) {
    return ESTADOS_PAGO.ANULADO;
  }
  if (pago.aplicado) {
    return ESTADOS_PAGO.CONCILIADO;
  }
  return ESTADOS_PAGO.PENDIENTE;
}

export function etiquetaEstadoPago(estado: EstadoPago): string {
  switch (estado) {
    case ESTADOS_PAGO.ANULADO:
      return 'Anulado';
    case ESTADOS_PAGO.CONCILIADO:
      return 'Conciliado';
    default:
      return 'Pendiente';
  }
}

export function puedeEditarPago(pago: {
  aplicado: boolean;
  deletedAt?: Date | string | null;
}): boolean {
  return resolverEstadoPago(pago) === ESTADOS_PAGO.PENDIENTE;
}

export function puedeAnularPago(pago: {
  deletedAt?: Date | string | null;
}): boolean {
  return pago.deletedAt == null;
}

export function puedeConciliarPago(pago: {
  aplicado: boolean;
  deletedAt?: Date | string | null;
}): boolean {
  return resolverEstadoPago(pago) !== ESTADOS_PAGO.ANULADO;
}
