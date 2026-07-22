/**
 * Estado tipado de promesas de pago (H16).
 * Fuente de verdad: columna `estadoPromesa` (tags en nota solo legado lectura).
 */

export const ESTADO_PROMESA = {
  PENDIENTE: 'PENDIENTE',
  CUMPLIDA: 'CUMPLIDA',
  VENCIDA: 'VENCIDA',
} as const;

export type EstadoPromesa =
  (typeof ESTADO_PROMESA)[keyof typeof ESTADO_PROMESA];

/** Tags legacy — solo para lectura de filas pre-backfill. */
const TAG_CUMPLIDA = '[PROMESA_CUMPLIDA]';
const TAG_VENCIDA = '[PROMESA_VENCIDA]';

/** Deriva estado desde columna; tags solo si columna vacía (legado). */
export function resolverEstadoPromesa(params: {
  estadoPromesa?: string | null;
  nota?: string | null;
  tienePromesa: boolean;
}): EstadoPromesa | null {
  if (!params.tienePromesa) {
    return null;
  }
  const col = params.estadoPromesa?.trim();
  if (
    col === ESTADO_PROMESA.CUMPLIDA ||
    col === ESTADO_PROMESA.VENCIDA ||
    col === ESTADO_PROMESA.PENDIENTE
  ) {
    return col;
  }
  const nota = params.nota ?? '';
  if (nota.includes(TAG_CUMPLIDA)) {
    return ESTADO_PROMESA.CUMPLIDA;
  }
  if (nota.includes(TAG_VENCIDA)) {
    return ESTADO_PROMESA.VENCIDA;
  }
  return ESTADO_PROMESA.PENDIENTE;
}

export function esPromesaAbierta(params: {
  estadoPromesa?: string | null;
  nota?: string | null;
  tienePromesa: boolean;
}): boolean {
  const estado = resolverEstadoPromesa(params);
  return estado === ESTADO_PROMESA.PENDIENTE;
}

/**
 * @deprecated H16: no escribir tags; usar solo `estadoPromesa`.
 * Conservado para tests de lectura legado.
 */
export function appendNotaPromesa(
  notaActual: string,
  tag: typeof TAG_CUMPLIDA | typeof TAG_VENCIDA,
  detalle: string,
): string {
  if (notaActual.includes(tag)) {
    return notaActual;
  }
  return `${notaActual}\n${tag} ${detalle}`;
}

export { TAG_CUMPLIDA, TAG_VENCIDA };

/** Cumplimiento por monto acumulado (tolerancia 1%). */
export function promesaCumplidaPorMonto(params: {
  montoPromesa: number;
  montoAcumuladoPagos: number;
}): boolean {
  if (params.montoPromesa <= 0) {
    return false;
  }
  return params.montoAcumuladoPagos >= params.montoPromesa * 0.99;
}
