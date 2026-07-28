'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PermissionGate } from '@/components/auth/permission-gate';
import { GestionRapidaModal } from '@/components/cobranza/gestion-rapida-modal';
import { PagoRapidaModal } from '@/components/cobranza/pago-rapida-modal';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { GET_CLIENTE_VISTA_360 } from '@/lib/graphql/queries/cobranza.queries';
import {
  prestamosOperativosCliente,
  type PrestamoClienteOperativo,
} from '@/lib/logic/cliente-cobranza-acciones-logic';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { formatearMoneda } from '@/types/cobranza';
import type { ClienteVista360 } from '@/types/cliente';

type AccionCobranza = 'pago' | 'gestion';

interface ClienteCobranzaAccionesProps {
  prestamos: ClienteVista360['prestamos'];
  /** Botones compactos para fila de tabla. */
  idprestamoFijo?: number;
  size?: 'md' | 'sm';
}

export function ClienteCobranzaAcciones({
  prestamos,
  idprestamoFijo,
  size = 'md',
}: ClienteCobranzaAccionesProps) {
  const queryClient = useQueryClient();
  const operativos = prestamosOperativosCliente(prestamos);

  const [accion, setAccion] = useState<AccionCobranza | null>(null);
  const [idprestamo, setIdprestamo] = useState<number | null>(null);
  const [selector, setSelector] = useState<AccionCobranza | null>(null);

  const btnSize = size;

  const invalidarVista = () => {
    void queryClient.invalidateQueries({
      queryKey: [GET_CLIENTE_VISTA_360],
    });
  };

  const abrir = (tipo: AccionCobranza, id?: number) => {
    if (id != null) {
      setIdprestamo(id);
      setAccion(tipo);
      return;
    }
    if (idprestamoFijo != null) {
      setIdprestamo(idprestamoFijo);
      setAccion(tipo);
      return;
    }
    if (operativos.length === 0) {
      return;
    }
    if (operativos.length === 1) {
      setIdprestamo(operativos[0].idprestamo);
      setAccion(tipo);
      return;
    }
    setSelector(tipo);
  };

  const elegirPrestamo = (p: PrestamoClienteOperativo) => {
    if (!selector) {
      return;
    }
    setIdprestamo(p.idprestamo);
    setAccion(selector);
    setSelector(null);
  };

  const cerrarModales = () => {
    setAccion(null);
    setIdprestamo(null);
  };

  const sinPrestamos = operativos.length === 0;
  const fijoNoOperativo =
    idprestamoFijo != null &&
    !operativos.some((p) => p.idprestamo === idprestamoFijo);

  if (sinPrestamos || fijoNoOperativo) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PermissionGate permiso={PERMISO.PAGO_WRITE}>
          <Button
            size={btnSize}
            className="field-touch-target"
            data-ux-id="cliente-registrar-pago"
            onClick={() => abrir('pago')}
          >
            Registrar pago
          </Button>
        </PermissionGate>
        <PermissionGate permiso={PERMISO.GESTION_WRITE}>
          <Button
            size={btnSize}
            variant="outline"
            className="field-touch-target"
            data-ux-id="cliente-tipificar"
            onClick={() => abrir('gestion')}
          >
            Tipificar gestión
          </Button>
        </PermissionGate>
      </div>

      <Modal
        isOpen={selector != null}
        onClose={() => setSelector(null)}
        title={
          selector === 'pago'
            ? '¿En qué préstamo registrar el pago?'
            : '¿En qué préstamo tipificar?'
        }
        size="md"
      >
        <ul className="divide-y divide-stroke dark:divide-dark-3">
          {operativos.map((p) => (
            <li key={p.idprestamo}>
              <button
                type="button"
                onClick={() => elegirPrestamo(p)}
                className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-dark-2"
              >
                <span className="min-w-0">
                  <span className="font-medium text-dark dark:text-white">
                    {p.noPrestamo}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-5">
                    {p.mandante} · {p.estado} · {p.diasMora}d mora
                  </span>
                </span>
                <span className="shrink-0 font-medium text-primary">
                  {formatearMoneda(p.saldoTotal)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      {accion === 'pago' && idprestamo != null ? (
        <PagoRapidaModal
          idprestamo={idprestamo}
          onClose={cerrarModales}
          onSuccess={invalidarVista}
        />
      ) : null}

      {accion === 'gestion' && idprestamo != null ? (
        <GestionRapidaModal
          idprestamo={idprestamo}
          onClose={cerrarModales}
          onSuccess={invalidarVista}
        />
      ) : null}
    </>
  );
}
