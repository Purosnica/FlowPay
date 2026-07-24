'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { CREATE_GESTION } from '@/lib/graphql/queries/cobranza.queries';
import { trackGestionCreated } from '@/lib/analytics/product-analytics';
import {
  claveAgendaItem,
  construirNotaGestionSecuencia,
  etiquetaCanalAccion,
  resolverAccionContacto,
  siguienteIndiceAccionable,
} from '@/lib/logic/secuencia-lote-logic';
import { csrfHeaders } from '@/lib/security/csrf';
import type { AgendaSecuenciaItem } from '@/types/cobranza';
import { cn } from '@/lib/utils';

type SecuenciaLotePanelProps = {
  items: AgendaSecuenciaItem[];
  onDone: () => void;
};

type FaseCola = 'idle' | 'enviando' | 'esperando_confirmacion' | 'registrando';

/**
 * Cola de secuencia: un contacto a la vez (sin abrir N ventanas).
 */
export function SecuenciaLotePanel({ items, onDone }: SecuenciaLotePanelProps) {
  const [colaIndex, setColaIndex] = useState<number | null>(null);
  const [fase, setFase] = useState<FaseCola>('idle');
  const [completados, setCompletados] = useState<Set<string>>(() => new Set());
  const [omitidos, setOmitidos] = useState(0);
  const [okCount, setOkCount] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createGestion = useGraphQLMutation<
    { createGestion: { idgestion: number } },
    { input: { idprestamo: number; nota: string; telefonoContacto?: string } }
  >(CREATE_GESTION, {
    successMessage: 'Gestión registrada correctamente',
  });

  const itemActual =
    colaIndex != null && colaIndex >= 0 ? (items[colaIndex] ?? null) : null;
  const accionActual = itemActual ? resolverAccionContacto(itemActual) : null;

  const progreso = useMemo(() => {
    const total = items.length;
    const hechos = completados.size;
    return { total, hechos, restantes: Math.max(0, total - hechos) };
  }, [items.length, completados.size]);

  useEffect(() => {
    if (colaIndex == null) {
      return;
    }
    if (colaIndex >= items.length) {
      setColaIndex(null);
      setFase('idle');
    }
  }, [colaIndex, items.length]);

  function iniciarCola(): void {
    setError(null);
    setStatus(null);
    setCompletados(new Set());
    setOmitidos(0);
    setOkCount(0);
    const idx = siguienteIndiceAccionable(items, 0);
    if (idx == null) {
      setStatus('No hay contactos accionables en la agenda de hoy.');
      setFase('idle');
      setColaIndex(null);
      return;
    }
    setColaIndex(idx);
    setFase('idle');
  }

  async function abrirContactoActual(): Promise<void> {
    if (!itemActual || !accionActual) {
      return;
    }
    setError(null);
    setFase('enviando');

    try {
      if (accionActual.tipo === 'omitido') {
        setOmitidos((n) => n + 1);
        avanzarTrasPaso(claveAgendaItem(itemActual), false);
        return;
      }

      if (accionActual.tipo === 'whatsapp' || accionActual.tipo === 'sms') {
        window.open(accionActual.url, '_blank', 'noopener,noreferrer');
        setFase('esperando_confirmacion');
        return;
      }

      if (accionActual.tipo !== 'email') {
        setOmitidos((n) => n + 1);
        avanzarTrasPaso(claveAgendaItem(itemActual), false);
        return;
      }

      const res = await fetch('/api/cobranza/enviar-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          to: accionActual.to,
          subject: accionActual.subject,
          body: accionActual.body,
          idprestamo: itemActual.idprestamo,
          idplantilla: itemActual.idplantilla ?? undefined,
        }),
      });
      if (!res.ok) {
        setError('No se pudo enviar el email. Puede omitir o reintentar.');
        setFase('esperando_confirmacion');
        return;
      }
      setFase('esperando_confirmacion');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al contactar',
      );
      setFase('esperando_confirmacion');
    }
  }

  async function confirmarYRegistrar(): Promise<void> {
    if (!itemActual) {
      return;
    }
    setFase('registrando');
    setError(null);
    try {
      await createGestion.mutateAsync({
        input: {
          idprestamo: itemActual.idprestamo,
          nota: construirNotaGestionSecuencia(itemActual),
          telefonoContacto: itemActual.telefono ?? undefined,
        },
      });
      trackGestionCreated();
      avanzarTrasPaso(claveAgendaItem(itemActual), true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al registrar gestión',
      );
      setFase('esperando_confirmacion');
    }
  }

  function omitirActual(): void {
    if (!itemActual) {
      return;
    }
    setOmitidos((n) => n + 1);
    avanzarTrasPaso(claveAgendaItem(itemActual), false);
  }

  function avanzarTrasPaso(clave: string, registrado: boolean): void {
    const nextCompletados = new Set(completados);
    nextCompletados.add(clave);
    setCompletados(nextCompletados);

    const gestiones = okCount + (registrado ? 1 : 0);
    const omisiones = omitidos + (registrado ? 0 : 1);
    if (registrado) {
      setOkCount(gestiones);
    } else {
      setOmitidos(omisiones);
    }

    const from = (colaIndex ?? 0) + 1;
    const nextIdx = siguienteIndiceAccionable(items, from);
    if (nextIdx == null) {
      setColaIndex(null);
      setFase('idle');
      setStatus(
        `Cola terminada. Gestiones: ${gestiones}. Omitidos: ${omisiones}.`,
      );
      onDone();
      return;
    }
    setColaIndex(nextIdx);
    setFase('idle');
  }

  function detenerCola(): void {
    setColaIndex(null);
    setFase('idle');
    setStatus(
      `Cola pausada. Completados: ${completados.size}. Gestiones: ${okCount}.`,
    );
  }

  if (items.length === 0) {
    return null;
  }

  const enCola = colaIndex != null;
  const busy = fase === 'enviando' || fase === 'registrando';

  return (
    <div className="mb-4 space-y-4" data-ux-id="secuencia-cola-panel">
      <div className="flex flex-wrap items-center gap-2">
        {!enCola ? (
          <Button
            type="button"
            size="sm"
            data-ux-id="secuencia-iniciar-cola"
            onClick={iniciarCola}
          >
            Iniciar cola ({items.length})
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={detenerCola}
            disabled={busy}
          >
            Pausar cola
          </Button>
        )}
        <p className="text-sm text-gray-500">
          {progreso.hechos}/{progreso.total} procesados · un contacto a la vez
        </p>
      </div>

      {enCola && itemActual && accionActual && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 dark:border-primary/50">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Contacto {colaIndex + 1} de {items.length}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-dark dark:text-white">
            {itemActual.nombreCliente}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {itemActual.noPrestamo} · {itemActual.canal} ·{' '}
            {etiquetaCanalAccion(accionActual)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {accionActual.tipo === 'omitido'
              ? accionActual.motivo
              : accionActual.tipo === 'email'
                ? itemActual.email
                : itemActual.telefono ?? '—'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {fase === 'idle' && (
              <Button
                type="button"
                size="sm"
                data-ux-id="secuencia-abrir-contacto"
                onClick={() => {
                  void abrirContactoActual();
                }}
              >
                {accionActual.tipo === 'email'
                  ? 'Enviar email'
                  : `Abrir ${etiquetaCanalAccion(accionActual)}`}
              </Button>
            )}
            {fase === 'esperando_confirmacion' && (
              <>
                <Button
                  type="button"
                  size="sm"
                  data-ux-id="secuencia-confirmar"
                  onClick={() => {
                    void confirmarYRegistrar();
                  }}
                >
                  Enviado — registrar y siguiente
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void abrirContactoActual();
                  }}
                >
                  Reabrir
                </Button>
              </>
            )}
            {(fase === 'idle' || fase === 'esperando_confirmacion') && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={omitirActual}
              >
                Omitir
              </Button>
            )}
            {fase === 'enviando' && (
              <p className="text-sm text-gray-500">Abriendo contacto…</p>
            )}
            {fase === 'registrando' && (
              <p className="text-sm text-gray-500">Registrando gestión…</p>
            )}
          </div>
          <Link
            href={`/cobranza/prestamos/${itemActual.idprestamo}`}
            className="mt-2 inline-block text-xs text-primary hover:underline"
          >
            Ver préstamo
          </Link>
        </div>
      )}

      {status && (
        <p className="text-sm text-dark dark:text-white" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-2">#</th>
              <th className="pb-2 pr-4">Préstamo</th>
              <th className="pb-2 pr-4">Cliente</th>
              <th className="pb-2 pr-4">Canal</th>
              <th className="pb-2 pr-4">Estado</th>
              <th className="pb-2">Contacto</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const clave = claveAgendaItem(item);
              const accion = resolverAccionContacto(item);
              const hecho = completados.has(clave);
              const activo = colaIndex === idx;
              return (
                <tr
                  key={clave}
                  className={cn(
                    'border-b border-stroke/50',
                    activo && 'bg-primary/10',
                    hecho && 'opacity-60',
                  )}
                >
                  <td className="py-2 pr-2">{idx + 1}</td>
                  <td className="py-2 pr-4">{item.noPrestamo}</td>
                  <td className="py-2 pr-4">{item.nombreCliente}</td>
                  <td className="py-2 pr-4">{item.canal}</td>
                  <td className="py-2 pr-4 text-xs">
                    {hecho
                      ? 'Hecho'
                      : activo
                        ? 'En curso'
                        : accion.tipo === 'omitido'
                          ? 'Sin datos'
                          : 'Pendiente'}
                  </td>
                  <td className="py-2 text-xs text-gray-500">
                    {accion.tipo === 'omitido'
                      ? accion.motivo
                      : accion.tipo === 'email'
                        ? item.email
                        : item.telefono ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
