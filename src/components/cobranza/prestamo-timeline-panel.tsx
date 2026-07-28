'use client';

import Link from 'next/link';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_TIMELINE_PRESTAMO } from '@/lib/graphql/queries/cobranza.queries';
import {
  formatearFechaTimeline,
  lineaSecundariaTimeline,
} from '@/lib/logic/prestamo-timeline-ui-logic';
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

const TIPO_DOT: Record<string, string> = {
  ESTADO: 'bg-primary',
  GESTION: 'bg-blue-500',
  PAGO: 'bg-emerald-500',
  ACUERDO: 'bg-purple-500',
  ASIGNACION: 'bg-gray-500',
  AUDITORIA: 'bg-amber-500',
};

const TIPO_LABELS: Record<string, string> = {
  ESTADO: 'Estado',
  GESTION: 'Gestión',
  PAGO: 'Pago',
  ACUERDO: 'Acuerdo',
  ASIGNACION: 'Asignación',
  AUDITORIA: 'Auditoría',
};

function EventoTimelineFila({ evento }: { evento: TimelineEvento }) {
  const secundaria = lineaSecundariaTimeline(
    evento.descripcion,
    evento.metadata,
  );
  const tituloIncluyeDesc =
    secundaria !== null &&
    evento.titulo.toLowerCase().includes(secundaria.toLowerCase());

  return (
    <li className="flex gap-2.5 py-1.5">
      <span
        className={cn(
          'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
          TIPO_DOT[evento.tipo] ?? 'bg-stroke',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 truncate text-sm leading-snug text-dark dark:text-white">
            <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-5 dark:text-dark-6">
              {TIPO_LABELS[evento.tipo] ?? evento.tipo}
            </span>
            <span className="font-medium">{evento.titulo}</span>
            {secundaria && !tituloIncluyeDesc ? (
              <span
                className="text-gray-5 dark:text-dark-6"
                title={evento.descripcion}
              >
                {' '}
                · {secundaria}
              </span>
            ) : null}
          </p>
          <time
            className="shrink-0 text-[10px] tabular-nums text-gray-5 dark:text-dark-6"
            dateTime={evento.fecha}
          >
            {formatearFechaTimeline(evento.fecha)}
          </time>
        </div>
        {evento.usuario ? (
          <p className="truncate text-[10px] leading-tight text-gray-400 dark:text-dark-6">
            {evento.usuario}
          </p>
        ) : null}
      </div>
    </li>
  );
}

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
    <div className="space-y-2">
      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
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
      <ul
        className={cn(
          'divide-y divide-stroke/70 dark:divide-dark-3/70',
          compact && 'max-h-64 overflow-y-auto pr-0.5',
        )}
      >
        {eventos.map((evento) => (
          <EventoTimelineFila key={evento.id} evento={evento} />
        ))}
      </ul>
      {compact ? (
        <div className="pt-1 text-right">
          <Link
            href={`/configuracion/auditoria?entidad=prestamo&entidadId=${idprestamo}`}
            className="text-[11px] text-primary hover:underline"
          >
            Ver auditoría
          </Link>
        </div>
      ) : null}
    </div>
  );
}
