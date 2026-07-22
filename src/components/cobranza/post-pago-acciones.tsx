'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { enlaceWhatsAppComprobante } from '@/lib/logic/comprobante-whatsapp-logic';
import { rutaComprobantePago } from '@/lib/logic/comprobante-pago-logic';
import type { ComprobantePago } from '@/types/cobranza';

type ComprobanteResumen = Pick<
  ComprobantePago,
  | 'idpago'
  | 'folio'
  | 'noPrestamo'
  | 'nombreCliente'
  | 'monto'
  | 'moneda'
  | 'saldoNuevo'
  | 'fechaPago'
  | 'mandanteNombre'
>;

interface PostPagoAccionesProps {
  /** Datos del comprobante (página completa) o solo idpago (banner post-pago). */
  comprobante?: ComprobanteResumen | null;
  idpago?: number;
  telefono?: string | null;
  /** Si true, Imprimir dispara window.print() (página comprobante). */
  imprimirInline?: boolean;
  className?: string;
}

/**
 * Acciones 1-tap post-pago: comprobante + WhatsApp (I047).
 */
export function PostPagoAcciones({
  comprobante,
  idpago,
  telefono,
  imprimirInline = false,
  className,
}: PostPagoAccionesProps) {
  const pagoId = comprobante?.idpago ?? idpago;
  if (pagoId == null) {
    return null;
  }

  const hrefComprobante = rutaComprobantePago(pagoId);
  const waHref = comprobante
    ? enlaceWhatsAppComprobante(comprobante, telefono)
    : null;

  return (
    <div className={className ?? 'flex flex-wrap gap-2'}>
      {imprimirInline ? (
        <Button type="button" onClick={() => window.print()}>
          Imprimir 80 mm
        </Button>
      ) : (
        <Link href={hrefComprobante}>
          <Button type="button">Comprobante</Button>
        </Link>
      )}
      {waHref ? (
        <a href={waHref} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="outline">
            Enviar por WhatsApp
          </Button>
        </a>
      ) : (
        <Link href={hrefComprobante}>
          <Button type="button" variant="outline">
            WhatsApp desde comprobante
          </Button>
        </Link>
      )}
    </div>
  );
}
