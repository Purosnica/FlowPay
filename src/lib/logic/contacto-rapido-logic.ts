/**
 * Enlaces de contacto rápido (llamada / WhatsApp vacío).
 */

import { enlaceWhatsApp } from '@/lib/cobranza/plantilla-mensaje-utils';

export function enlaceLlamadaTelefonica(
  telefono: string | null | undefined,
): string | null {
  const digits = (telefono ?? '').replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  return `tel:${digits}`;
}

export function enlaceWhatsAppContacto(
  telefono: string | null | undefined,
  mensaje = '',
): string | null {
  const raw = (telefono ?? '').trim();
  if (!raw) {
    return null;
  }
  return enlaceWhatsApp(raw, mensaje);
}
