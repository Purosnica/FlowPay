import type { ClienteVista360 } from '@/types/cliente';

const ESTADOS_NO_OPERATIVOS = new Set(['Cancelado', 'Finalizado']);

export type PrestamoClienteOperativo = ClienteVista360['prestamos'][number];

/**
 * Préstamos sobre los que se puede tipificar o registrar pago
 * desde la vista 360 / búsqueda por nombre.
 */
export function prestamosOperativosCliente(
  prestamos: ClienteVista360['prestamos'],
): PrestamoClienteOperativo[] {
  return prestamos.filter((p) => !ESTADOS_NO_OPERATIVOS.has(p.estado));
}
