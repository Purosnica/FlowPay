'use client';

import Link from 'next/link';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_TIMELINE_PRESTAMO } from '@/lib/graphql/queries/cobranza.queries';
import { cn } from '@/lib/utils';

interface TimelineEvento {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  usuario: string | null;
  metadata: string | null;
  fecha: string;
}

const TIPO_STYLES: Record<string, string> = {
  ESTADO: 'border-l-primary bg-primary/5',
  GESTION: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20',
  PAGO: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
  ACUERDO: 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/20',
  ASIGNACION: 'border-l-gray-500 bg-gray-50 dark:bg-dark-2',
  AUDITORIA: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20',
};

const TIPO_LABELS: Record<string, string> = {
  ESTADO: 'Estado',
  GESTION: 'Gestión',
  PAGO: 'Pago',
  ACUERDO: 'Acuerdo',
  ASIGNACION: 'Asignación',
  AUDITORIA: 'Auditoría',
};

export function PrestamoTimelinePanel({
  idprestamo,
  compact = false,
}: {
  idprestamo: number;
  compact?: boolean;
}) {
  const { data, isLoading } = useGraphQLQuery<{
    timelinePrestamo: TimelineEvento[];
  }>(GET_TIMELINE_PRESTAMO, { idprestamo, limite: compact ? 8 : 50 });

  const eventos = data?.timelinePrestamo ?? [];

  if (isLoading) {
    return <p className="text-sm text-gray-500">Cargando timeline...</p>;
  }

  if (eventos.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Sin eventos registrados para este préstamo.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {eventos.length} evento(s) en orden cronológico
          </p>
          <Link
            href={`/configuracion/auditoria?entidad=prestamo&entidadId=${idprestamo}`}
            className="text-xs text-primary hover:underline"
          >
            Ver auditoría completa
          </Link>
        </div>
      )}
      <ul className="space-y-2">
        {eventos.map((evento) => (
          <li
            key={evento.id}
            className={cn(
              'rounded-lg border border-l-4 p-3 dark:border-dark-3',
              TIPO_STYLES[evento.tipo] ?? 'border-l-stroke',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-dark-3 dark:text-gray-300">
                    {TIPO_LABELS[evento.tipo] ?? evento.tipo}
                  </span>
                  <span className="font-medium text-dark dark:text-white">
                    {evento.titulo}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {evento.descripcion}
                </p>
                {evento.metadata && (
                  <p className="mt-1 text-xs text-gray-500">{evento.metadata}</p>
                )}
              </div>
              <time
                className="shrink-0 text-xs text-gray-500"
                dateTime={evento.fecha}
              >
                {new Date(evento.fecha).toLocaleString('es-NI')}
              </time>
            </div>
            {evento.usuario && (
              <p className="mt-1 text-xs text-gray-400">Por: {evento.usuario}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
