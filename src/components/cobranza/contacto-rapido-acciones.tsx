'use client';

import { Button } from '@/components/ui/button';
import {
  enlaceLlamadaTelefonica,
  enlaceWhatsAppContacto,
} from '@/lib/logic/contacto-rapido-logic';

interface ContactoRapidoAccionesProps {
  telefono?: string | null;
  /** Mensaje opcional para WhatsApp. */
  mensajeWhatsApp?: string;
  className?: string;
}

/**
 * Acciones 1-tap: llamar y WhatsApp (auditoría UX P0).
 */
export function ContactoRapidoAcciones({
  telefono,
  mensajeWhatsApp = '',
  className,
}: ContactoRapidoAccionesProps) {
  const telHref = enlaceLlamadaTelefonica(telefono);
  const waHref = enlaceWhatsAppContacto(telefono, mensajeWhatsApp);

  if (!telHref && !waHref) {
    return null;
  }

  return (
    <div className={className ?? 'flex flex-wrap gap-2'}>
      {telHref ? (
        <a href={telHref} aria-label={`Llamar a ${telefono}`}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-ux-id="contacto-llamar"
          >
            Llamar
          </Button>
        </a>
      ) : null}
      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir WhatsApp con ${telefono}`}
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-ux-id="contacto-whatsapp"
          >
            WhatsApp
          </Button>
        </a>
      ) : null}
    </div>
  );
}
