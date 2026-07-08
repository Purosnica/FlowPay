'use client';

import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_HISTORIAL_ESTADOS_PRESTAMO } from '@/lib/graphql/queries/cobranza.queries';

interface HistorialEstado {
  idhistorial: number;
  estadoAnterior: string | null;
  estadoNuevo: string;
  motivo: string | null;
  usuario: string | null;
  createdAt: string;
}

export function PrestamoEstadoHistorialPanel({
  idprestamo,
}: {
  idprestamo: number;
}) {
  const { data, isLoading } = useGraphQLQuery<{
    historialEstadosPrestamo: HistorialEstado[];
  }>(GET_HISTORIAL_ESTADOS_PRESTAMO, { idprestamo });

  const items = data?.historialEstadosPrestamo ?? [];

  if (isLoading) {
    return <p className="text-sm text-gray-500">Cargando historial...</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Sin transiciones de estado registradas.
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
            <span className="font-medium text-primary">{h.estadoNuevo}</span>
            <span className="text-xs text-gray-500">
              {new Date(h.createdAt).toLocaleString('es-NI')}
            </span>
          </div>
          {h.estadoAnterior && (
            <p className="text-xs text-gray-500">
              Desde: {h.estadoAnterior}
            </p>
          )}
          {h.motivo && <p className="mt-1 text-gray-600">{h.motivo}</p>}
          {h.usuario && (
            <p className="text-xs text-gray-400">Por: {h.usuario}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
