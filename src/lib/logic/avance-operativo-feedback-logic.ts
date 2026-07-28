/**
 * Mensajes de feedback para auto-avance operativo.
 */

export function mensajeAvanceOperativo(params: {
  accion: 'gestion' | 'pago';
  haySiguiente: boolean;
  posicionSiguiente?: number;
  total?: number;
  /** Nombre del cliente del caso al que se avanzó. */
  nombreSiguiente?: string | null;
}): string {
  const verbo =
    params.accion === 'pago' ? 'Pago registrado' : 'Gestión guardada';
  if (
    params.haySiguiente &&
    params.posicionSiguiente != null &&
    params.total != null
  ) {
    const nombre = params.nombreSiguiente?.trim();
    const quien = nombre ? `: ${nombre}` : '';
    return `${verbo}. Siguiente caso${quien} (${params.posicionSiguiente}/${params.total}).`;
  }
  return `${verbo}. Fin de la cola.`;
}
