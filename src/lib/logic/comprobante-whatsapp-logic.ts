/**
 * Mensaje y enlace WhatsApp para comprobante de pago (I047).
 */

import { formatearFechaComprobante } from '@/lib/logic/comprobante-pago-logic';
import { enlaceWhatsApp } from '@/lib/cobranza/plantilla-mensaje-utils';
import { formatearMoneda } from '@/types/cobranza';
import type { ComprobantePago } from '@/types/cobranza';

export function mensajeComprobanteWhatsApp(
  c: Pick<
    ComprobantePago,
    | 'folio'
    | 'noPrestamo'
    | 'nombreCliente'
    | 'monto'
    | 'moneda'
    | 'saldoNuevo'
    | 'fechaPago'
    | 'mandanteNombre'
  >,
): string {
  const monto = formatearMoneda(c.monto, c.moneda);
  const saldo = formatearMoneda(c.saldoNuevo, c.moneda);
  const fecha = formatearFechaComprobante(c.fechaPago);
  return [
    `Comprobante FlowPay ${c.folio}`,
    `Cliente: ${c.nombreCliente}`,
    `Préstamo: ${c.noPrestamo}`,
    `Pago: ${monto} (${fecha})`,
    `Saldo: ${saldo}`,
    `Mandante: ${c.mandanteNombre}`,
  ].join('\n');
}

/**
 * Abre WhatsApp con mensaje prellenado.
 * Si hay teléfono, va directo al chat; si no, abre el selector de contacto.
 */
export function enlaceWhatsAppComprobante(
  c: Parameters<typeof mensajeComprobanteWhatsApp>[0],
  telefono?: string | null,
): string {
  const mensaje = mensajeComprobanteWhatsApp(c);
  if (telefono?.trim()) {
    return enlaceWhatsApp(telefono, mensaje);
  }
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}
