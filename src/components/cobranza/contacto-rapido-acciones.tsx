'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRegistrarGestionContacto } from '@/hooks/use-registrar-gestion-contacto';
import {
  enlaceLlamadaTelefonica,
  enlaceWhatsAppContacto,
} from '@/lib/logic/contacto-rapido-logic';

interface ContactoRapidoAccionesProps {
  /** Si se informa, registra gestión al iniciar llamada/WhatsApp. */
  idprestamo?: number | null;
  telefono?: string | null;
  /** Mensaje opcional para WhatsApp. */
  mensajeWhatsApp?: string;
  className?: string;
}

/**
 * Acciones 1-tap: llamar y WhatsApp.
 * Con idprestamo, registra automáticamente la gestión (LLC / TTC).
 */
export function ContactoRapidoAcciones({
  idprestamo,
  telefono,
  mensajeWhatsApp = '',
  className,
}: ContactoRapidoAccionesProps) {
  const telHref = enlaceLlamadaTelefonica(telefono);
  const waHref = enlaceWhatsAppContacto(telefono, mensajeWhatsApp);
  const { registrar, isPending } = useRegistrarGestionContacto({
    enabled: Boolean(idprestamo),
  });
  const [error, setError] = useState<string | null>(null);

  if (!telHref && !waHref) {
    return null;
  }

  const registrarSiAplica = (canal: 'LLAMADA' | 'WHATSAPP'): void => {
    if (!idprestamo) {
      return;
    }
    setError(null);
    void registrar({
      idprestamo,
      canal,
      telefono,
      mensajeSnippet:
        canal === 'WHATSAPP' ? mensajeWhatsApp || null : null,
    }).then((result) => {
      if (!result.ok) {
        setError(result.error);
      }
    });
  };

  return (
    <div className={className ?? 'flex flex-col gap-1'}>
      <div className="flex flex-wrap gap-2">
        {telHref ? (
          <a
            href={telHref}
            aria-label={`Llamar a ${telefono}`}
            onClick={() => registrarSiAplica('LLAMADA')}
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
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
            onClick={() => registrarSiAplica('WHATSAPP')}
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              data-ux-id="contacto-whatsapp"
            >
              WhatsApp
            </Button>
          </a>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
