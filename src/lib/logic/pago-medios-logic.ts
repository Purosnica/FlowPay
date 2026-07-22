/** Catálogo de medios de pago (Zod / UI). */
export const MEDIOS_PAGO = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'DEPOSITO',
  'CHEQUE',
  'TARJETA',
  'OTRO',
] as const;

export type MedioPago = (typeof MEDIOS_PAGO)[number];

export function esMedioPagoValido(value: string): value is MedioPago {
  return (MEDIOS_PAGO as readonly string[]).includes(value);
}
