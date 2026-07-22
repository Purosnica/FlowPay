'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql/client';
import { CREATE_GESTION } from '@/lib/graphql/queries/cobranza.queries';
import {
  contarGestionOutbox,
  listarGestionOutbox,
  marcarErrorGestionOutbox,
  removerGestionOutbox,
  type GestionOutboxItem,
} from '@/lib/offline/gestion-outbox';
import { trackGestionCreated } from '@/lib/analytics/product-analytics';

/**
 * Sincroniza la cola offline de gestiones al recuperar red (I036 / H20).
 * Continúa con el siguiente ítem si uno falla (no aborta toda la cola).
 */
export function GestionOutboxSync() {
  const queryClient = useQueryClient();
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoError, setUltimoError] = useState<string | null>(null);
  const flushing = useRef(false);

  const refrescar = useCallback(() => {
    setPendientes(contarGestionOutbox());
  }, []);

  const flush = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }
    if (flushing.current) {
      return;
    }
    const cola = listarGestionOutbox();
    if (cola.length === 0) {
      return;
    }
    flushing.current = true;
    setSincronizando(true);
    setUltimoError(null);
    let enviados = 0;
    let ultimoMsg: string | null = null;
    try {
      for (const item of cola) {
        try {
          await enviarItem(item);
          removerGestionOutbox(item.id);
          trackGestionCreated();
          enviados++;
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : 'Fallo de sincronización';
          marcarErrorGestionOutbox(item.id, msg);
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
    void flush();
    return () => {
      window.removeEventListener('online', onChange);
      window.removeEventListener('flowpay:gestion-outbox', onChange);
    };
  }, [flush, refrescar]);

  if (pendientes === 0 && !ultimoError) {
    return null;
  }

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
    >
      {sincronizando
        ? `Sincronizando ${pendientes} gestión(es) pendientes…`
        : pendientes > 0
          ? `${pendientes} gestión(es) pendientes de sincronizar (sin conexión previa).`
          : null}
      {ultimoError ? (
        <span className="ml-2 text-red-700 dark:text-red-300">
          {ultimoError}
        </span>
      ) : null}
    </div>
  );
}

async function enviarItem(item: GestionOutboxItem): Promise<void> {
  await graphqlRequest(CREATE_GESTION, { input: item.payload });
}
