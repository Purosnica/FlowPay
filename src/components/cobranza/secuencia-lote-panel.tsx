'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { CREATE_GESTION } from '@/lib/graphql/queries/cobranza.queries';
import {
  claveAgendaItem,
  construirNotaGestionSecuencia,
  delayMs,
  resolverAccionContacto,
} from '@/lib/logic/secuencia-lote-logic';
import { csrfHeaders } from '@/lib/security/csrf';
import type { AgendaSecuenciaItem } from '@/types/cobranza';

type SecuenciaLotePanelProps = {
  items: AgendaSecuenciaItem[];
  onDone: () => void;
};

export function SecuenciaLotePanel({ items, onDone }: SecuenciaLotePanelProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.map(claveAgendaItem)),
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createGestion = useGraphQLMutation<
    { createGestion: { idgestion: number } },
    { input: { idprestamo: number; nota: string; telefonoContacto?: string } }
  >(CREATE_GESTION);

  const seleccionados = useMemo(
    () => items.filter((i) => selected.has(claveAgendaItem(i))),
    [items, selected],
  );

  function toggle(clave: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) {
        next.delete(clave);
      } else {
        next.add(clave);
      }
      return next;
    });
  }

  function toggleAll(): void {
    if (selected.size === items.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(items.map(claveAgendaItem)));
  }

  async function contactarSeleccionados(): Promise<void> {
    setBusy(true);
    setError(null);
    setStatus(null);

    let abiertos = 0;
    let emails = 0;
    let omitidos = 0;

    try {
      for (const item of seleccionados) {
        const accion = resolverAccionContacto(item);
        if (accion.tipo === 'omitido') {
          omitidos += 1;
          continue;
        }
        if (accion.tipo === 'whatsapp' || accion.tipo === 'sms') {
          window.open(accion.url, '_blank', 'noopener,noreferrer');
          abiertos += 1;
          await delayMs(400);
          continue;
        }

        if (accion.tipo !== 'email') {
          omitidos += 1;
          continue;
        }

        const res = await fetch('/api/cobranza/enviar-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...csrfHeaders(),
          },
          body: JSON.stringify({
            to: accion.to,
            subject: accion.subject,
            body: accion.body,
            idprestamo: item.idprestamo,
            idplantilla: item.idplantilla ?? undefined,
          }),
        });
        if (!res.ok) {
          omitidos += 1;
          continue;
        }
        emails += 1;
        await delayMs(200);
      }

      setStatus(
        `Contactos: ${abiertos} enlaces, ${emails} emails, ${omitidos} omitidos.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al contactar en lote',
      );
    } finally {
      setBusy(false);
    }
  }

  async function marcarContactados(): Promise<void> {
    setBusy(true);
    setError(null);
    setStatus(null);

    let ok = 0;
    let fail = 0;

    try {
      for (const item of seleccionados) {
        try {
          await createGestion.mutateAsync({
            input: {
              idprestamo: item.idprestamo,
              nota: construirNotaGestionSecuencia(item),
              telefonoContacto: item.telefono ?? undefined,
            },
          });
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      setStatus(`Gestiones registradas: ${ok}. Fallidas: ${fail}.`);
      onDone();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al marcar contactados',
      );
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={toggleAll}
          disabled={busy}
        >
          {selected.size === items.length ? 'Quitar selección' : 'Seleccionar todos'}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            void contactarSeleccionados();
          }}
          disabled={busy || seleccionados.length === 0}
        >
          Contactar seleccionados ({seleccionados.length})
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            void marcarContactados();
          }}
          disabled={busy || seleccionados.length === 0}
        >
          Marcar contactados
        </Button>
      </div>
      {status && (
        <p className="text-sm text-dark dark:text-white">{status}</p>
      )}
      {error && <p className="text-sm text-red">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-2">Sel.</th>
              <th className="pb-2 pr-4">Préstamo</th>
              <th className="pb-2 pr-4">Cliente</th>
              <th className="pb-2 pr-4">Canal</th>
              <th className="pb-2 pr-4">Plantilla</th>
              <th className="pb-2">Contacto</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const clave = claveAgendaItem(item);
              const accion = resolverAccionContacto(item);
              return (
                <tr key={clave} className="border-b border-stroke/50">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={selected.has(clave)}
                      onChange={() => toggle(clave)}
                      disabled={busy}
                      aria-label={`Seleccionar ${item.noPrestamo}`}
                    />
                  </td>
                  <td className="py-2 pr-4">{item.noPrestamo}</td>
                  <td className="py-2 pr-4">{item.nombreCliente}</td>
                  <td className="py-2 pr-4">{item.canal}</td>
                  <td className="py-2 pr-4">
                    {item.plantillaNombre ?? item.accion ?? '—'}
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
