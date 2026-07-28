import type { PagoAplicadoDesglose } from '@/types/cobranza';

export function etiquetaPagoAplicadoDesglose(
  pago: Pick<PagoAplicadoDesglose, 'fechaPago' | 'medio' | 'folio'>,
): string {
  const fecha = new Date(pago.fechaPago).toLocaleDateString('es-NI');
  const partes = [fecha];
  if (pago.medio) {
    partes.push(pago.medio);
  }
  if (pago.folio) {
    partes.push(pago.folio);
  }
  return partes.join(' · ');
}
