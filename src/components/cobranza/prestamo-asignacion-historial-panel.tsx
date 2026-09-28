'use client';

import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_HISTORIAL_ASIGNACION } from '@/lib/graphql/queries/cobranza.queries';

interface HistorialAsignacion {
  idhistorial: number;
  gestorAnterior: string | null;
  gestorNuevo: string;
  usuario: string;
  motivo: string | null;
  createdAt: string;
}

/** Traza legible de cada cobrador que ha tenido el crÃ©dito. */
export function PrestamoAsignacionHistorialPanel({
  idprestamo,
}: {
  idprestamo: number;
}) {
  const { data, isLoading } = useGraphQLQuery<{
    historialAsignacionPrestamo: HistorialAsignacion[];
  }>(GET_HISTORIAL_ASIGNACION, { idprestamo });

  const items = data?.historialAsignacionPrestamo ?? [];

  if (isLoading) {
    return <p className="text-sm text-gray-500">Cargando historial de cobradores...</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Sin asignaciones registradas para este crÃ©dito.
      </p>
    );
  }

  return (
    <ul className="space-y-2 text-sm">
      {items.map((h) => (
        <li
          key={h.idhistorial}
          className="rounded border border-stroke p-3 dark:border-dark-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-dark dark:text-white">
              {h.gestorAnterior ?? 'Sin asignar'} <span aria-hidden>â†’</span>{' '}
              <span className="text-primary">{h.gestorNuevo}</span>
            </p>
            <time className="text-xs text-gray-500" dateTime={h.createdAt}>
              {new Date(h.createdAt).toLocaleString('es-NI')}
            </time>
          </div>
          {h.motivo ? <p className="mt-1 text-gray-600">{h.motivo}</p> : null}
          <p className="mt-1 text-xs text-gray-400">Asignado por: {h.usuario}</p>
        </li>
      ))}
    </ul>
  );
}
