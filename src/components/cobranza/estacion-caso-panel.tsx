'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ContactoRapidoAcciones } from '@/components/cobranza/contacto-rapido-acciones';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { formatearMoneda } from '@/types/cobranza';

export type EstacionCasoResumen = {
  idprestamo: number;
  noPrestamo: string;
  nombreCliente: string;
  saldoTotal: number;
  diasMora: number;
  moneda?: string;
  telefono?: string | null;
  motivoPrioridad?: string | null;
  scorePrioridad?: number | null;
};

type EstacionCasoPanelProps = {
  caso: EstacionCasoResumen | null;
  posicion: number;
  total: number;
  onTipificar: () => void;
  onPago: () => void;
  puedeGestion?: boolean;
  puedePago?: boolean;
  /** Si false, oculta el enlace a bandeja (cuando ya estamos ahí). */
  mostrarLinkBandeja?: boolean;
};

/**
 * Panel derecho de la estación operativa: contexto + acciones del caso seleccionado.
 */
export function EstacionCasoPanel({
  caso,
  posicion,
  total,
  onTipificar,
  onPago,
  puedeGestion = true,
  puedePago = true,
  mostrarLinkBandeja = true,
}: EstacionCasoPanelProps) {
  if (!caso) {
    return (
      <div className="rounded-lg border border-dashed border-stroke p-6 text-sm text-gray-500 dark:border-dark-3">
        Seleccione un caso de la lista (o use J/K).
      </div>
    );
  }

  const tieneTelefono = Boolean(caso.telefono?.trim());

  return (
    <div
      className="rounded-lg border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark"
      data-ux-id="estacion-caso-panel"
      aria-live="polite"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Caso {posicion} de {total}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-dark dark:text-white">
        {caso.nombreCliente}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {caso.noPrestamo} · {caso.diasMora}d mora ·{' '}
        {formatearMoneda(caso.saldoTotal, caso.moneda)}
      </p>
      {caso.motivoPrioridad && (
        <p className="mt-1 text-xs text-gray-500">{caso.motivoPrioridad}</p>
      )}

      <div className="mt-3">
        {tieneTelefono ? (
          <ContactoRapidoAcciones telefono={caso.telefono} />
        ) : (
          <p
            className="text-xs text-amber-700 dark:text-amber-300"
            role="status"
          >
            Sin teléfono registrado — abra detalle para otros contactos.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {puedePago && (
          <PermissionGate permiso={PERMISO.PAGO_WRITE}>
            <Button
              size="sm"
              data-ux-id="estacion-pago"
              onClick={onPago}
            >
              Registrar pago
            </Button>
          </PermissionGate>
        )}
        {puedeGestion && (
          <PermissionGate permiso={PERMISO.GESTION_WRITE}>
            <Button
              size="sm"
              variant="outline"
              data-ux-id="estacion-tipificar"
              onClick={onTipificar}
            >
              Tipificar
            </Button>
          </PermissionGate>
        )}
        <Link href={`/cobranza/prestamos/${caso.idprestamo}`}>
          <Button size="sm" variant="ghost">
            Detalle
          </Button>
        </Link>
        {mostrarLinkBandeja ? (
          <Link href="/cobranza/bandeja">
            <Button size="sm" variant="ghost">
              Toda la bandeja
            </Button>
          </Link>
        ) : (
          <Link href="/cobranza/mi-dia">
            <Button size="sm" variant="ghost">
              Mi día
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
