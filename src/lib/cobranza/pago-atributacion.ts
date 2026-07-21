/**
 * Atribución de cobrador en pagos — misma regla que liquidación.
 *
 * Prioridad: gestor de la gestión vinculada → gestor asignado al préstamo.
 * No usar `pago.idgestor` (quien registró/importó el pago).
 */

export function resolverIdGestorPago(pago: {
  gestion?: { idgestor: number } | null;
  prestamo: { idgestorAsignado: number | null };
}): number | null {
  return pago.gestion?.idgestor ?? pago.prestamo.idgestorAsignado ?? null;
}

/** Día calendario UTC (YYYY-MM-DD) para fechas de negocio sin TZ. */
export function fechaCalendarioUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}
