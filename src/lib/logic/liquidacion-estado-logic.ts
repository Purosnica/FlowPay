/**
 * Máquina de estados de liquidación (sin acceso a BD).
 */

export const ESTADOS_LIQUIDACION = {
  BORRADOR: 'BORRADOR',
  EMITIDA: 'EMITIDA',
  PAGADA: 'PAGADA',
} as const;

export type EstadoLiquidacion =
  (typeof ESTADOS_LIQUIDACION)[keyof typeof ESTADOS_LIQUIDACION];

/** Regenerar/reutilizar solo borradores; EMITIDA/PAGADA son inmutables. */
export function puedeRegenerarLiquidacion(estado: string): boolean {
  return estado === ESTADOS_LIQUIDACION.BORRADOR;
}

/** Soft-delete operativo solo en borrador. */
export function puedeAnularLiquidacion(estado: string): boolean {
  return estado === ESTADOS_LIQUIDACION.BORRADOR;
}

export function puedeEmitirLiquidacion(estado: string): boolean {
  return estado === ESTADOS_LIQUIDACION.BORRADOR;
}

export function puedeMarcarLiquidacionPagada(estado: string): boolean {
  return estado === ESTADOS_LIQUIDACION.EMITIDA;
}

export function puedeRevertirLiquidacionPagada(estado: string): boolean {
  return estado === ESTADOS_LIQUIDACION.PAGADA;
}
