'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { graphqlRequest } from '@/lib/graphql/client';
import {
  CREATE_GESTION,
  CREATE_PAGO,
} from '@/lib/graphql/queries/cobranza.queries';
import {
  contarGestionOutbox,
  listarGestionOutbox,
  marcarErrorGestionOutbox,
  removerGestionOutbox,
  type GestionOutboxItem,
} from '@/lib/offline/gestion-outbox';
import {
  contarPagoOutbox,
  listarPagoOutbox,
  marcarErrorPagoOutbox,
  removerPagoOutbox,
  type PagoOutboxItem,
} from '@/lib/offline/pago-outbox';
import { trackGestionCreated } from '@/lib/analytics/product-analytics';

/**
 * Sincroniza colas offline de gestiones y pagos al recuperar red.
 */
export function GestionOutboxSync() {
  const queryClient = useQueryClient();
  const [pendientesGes, setPendientesGes] = useState(0);
  const [pendientesPago, setPendientesPago] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoError, setUltimoError] = useState<string | null>(null);
  const flushing = useRef(false);

  const refrescar = useCallback(() => {
    setPendientesGes(contarGestionOutbox());
    setPendientesPago(contarPagoOutbox());
  }, []);

  const flush = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }
    if (flushing.current) {
      return;
    }
    const colaGes = listarGestionOutbox();
    const colaPago = listarPagoOutbox();
    if (colaGes.length === 0 && colaPago.length === 0) {
      return;
    }
    flushing.current = true;
    setSincronizando(true);
    setUltimoError(null);
    let enviados = 0;
    let ultimoMsg: string | null = null;
    try {
      for (const item of colaGes) {
        try {
          await enviarGestion(item);
          removerGestionOutbox(item.id);
          trackGestionCreated();
          enviados += 1;
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : 'Fallo de sincronización';
          marcarErrorGestionOutbox(item.id, msg);
          ultimoMsg = msg;
        }
      }
      for (const item of colaPago) {
        try {
          await enviarPago(item);
          removerPagoOutbox(item.id);
          enviados += 1;
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : 'Fallo de sincronización';
          marcarErrorPagoOutbox(item.id, msg);
          ultimoMsg = msg;
        }
      }
      if (enviados > 0) {
        void queryClient.invalidateQueries();
      }
      if (ultimoMsg) {
        setUltimoError(ultimoMsg);
      }
      refrescar();
    } finally {
      flushing.current = false;
      setSincronizando(false);
    }
  }, [queryClient, refrescar]);

  useEffect(() => {
    refrescar();
    const onChange = () => {
      refrescar();
      void flush();
    };
    window.addEventListener('online', onChange);
    window.addEventListener('flowpay:gestion-outbox', onChange);
    window.addEventListener('flowpay:pago-outbox', onChange);
    void flush();
    return () => {
      window.removeEventListener('online', onChange);
      window.removeEventListener('flowpay:gestion-outbox', onChange);
      window.removeEventListener('flowpay:pago-outbox', onChange);
    };
  }, [flush, refrescar]);

  const pendientes = pendientesGes + pendientesPago;
  if (pendientes === 0 && !ultimoError) {
    return null;
  }

  const partes: string[] = [];
  if (pendientesGes > 0) {
    partes.push(`${pendientesGes} gestión(es)`);
  }
  if (pendientesPago > 0) {
    partes.push(`${pendientesPago} pago(s)`);
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <span>
        {sincronizando
          ? `Sincronizando ${partes.join(' y ')}…`
          : pendientes > 0
            ? `${partes.join(' y ')} pendientes de sincronizar.`
            : null}
      </span>
      {ultimoError ? (
        <span className="text-red-700 dark:text-red-300">{ultimoError}</span>
      ) : null}
      {!sincronizando && pendientes > 0 ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-ux-id="outbox-reintentar"
          onClick={() => {
            void flush();
          }}
        >
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

async function enviarGestion(item: GestionOutboxItem): Promise<void> {
  await graphqlRequest(CREATE_GESTION, { input: item.payload });
}

async function enviarPago(item: PagoOutboxItem): Promise<void> {
  await graphqlRequest(CREATE_PAGO, { input: item.payload });
}
