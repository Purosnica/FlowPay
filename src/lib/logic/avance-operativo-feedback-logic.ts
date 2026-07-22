/**
 * Mensajes de feedback para auto-avance operativo.
 */

export function mensajeAvanceOperativo(params: {
  accion: 'gestion' | 'pago';
  haySiguiente: boolean;
  posicionSiguiente?: number;
  total?: number;
}): string {
  const verbo =
    params.accion === 'pago' ? 'Pago registrado' : 'Gestión guardada';
  if (
    params.haySiguiente &&
    params.posicionSiguiente != null &&
    params.total != null
  ) {
    return `${verbo}. Siguiente caso ${params.posicionSiguiente}/${params.total}.`;
  }
  return `${verbo}. Fin de la cola.`;
}
