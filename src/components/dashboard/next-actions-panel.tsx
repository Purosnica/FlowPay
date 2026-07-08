'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  construirAccionesCobrador,
  type AccionSugerida,
  type PrioridadAccion,
} from '@/lib/dashboard/next-actions';
import type { MiDiaResumen } from '@/types/cobranza';

const ESTILO_PRIORIDAD: Record<
  PrioridadAccion,
  { badge: string; etiqueta: string; borde: string }
> = {
  urgente: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    etiqueta: 'Urgente',
    borde: 'border-red-200 dark:border-red-900',
  },
  alta: {
    badge:
      'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    etiqueta: 'Prioritario',
    borde: 'border-amber-200 dark:border-amber-900',
  },
  normal: {
    badge:
      'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
    etiqueta: 'Pendiente',
    borde: 'border-stroke dark:border-dark-3',
  },
};

function AccionItem({ accion }: { accion: AccionSugerida }) {
  const estilo = ESTILO_PRIORIDAD[accion.prioridad];
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4 ${estilo.borde}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estilo.badge}`}
          >
            {estilo.etiqueta}
          </span>
          <span className="text-sm font-semibold text-dark dark:text-white">
            {accion.cantidad} {accion.cantidad === 1 ? 'caso' : 'casos'}
          </span>
        </div>
        <p className="mt-1 font-medium text-dark dark:text-white">
          {accion.titulo}
        </p>
        <p className="mt-0.5 text-sm text-gray-500">{accion.descripcion}</p>
      </div>
      <Link href={accion.href}>
        <Button size="sm">{accion.ctaLabel}</Button>
      </Link>
    </div>
  );
}

export interface NextActionsPanelProps {
  miDia: MiDiaResumen | null | undefined;
  isLoading: boolean;
}

export function NextActionsPanel({ miDia, isLoading }: NextActionsPanelProps) {
  const acciones = miDia ? construirAccionesCobrador(miDia) : [];

  return (
    <section className="rounded-lg border border-stroke p-6 dark:border-dark-3">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-dark dark:text-white">
            Qué hacer ahora
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Tus próximas acciones ordenadas por prioridad.
          </p>
        </div>
        <Link href="/cobranza/mi-dia">
          <Button variant="outline" size="sm">
            Abrir Mi día
          </Button>
        </Link>
      </div>

      {isLoading && !miDia && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && acciones.length === 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-950/20">
          <p className="font-medium text-green-800 dark:text-green-300">
            Vas al día
          </p>
          <p className="mt-1 text-sm text-green-700/80 dark:text-green-400/80">
            No tienes acciones urgentes pendientes. Revisa tu bandeja para
            adelantar trabajo.
          </p>
          <Link href="/cobranza/bandeja" className="mt-3 inline-block">
            <Button variant="outline" size="sm">
              Ir a mi bandeja
            </Button>
          </Link>
        </div>
      )}

      {acciones.length > 0 && (
        <div className="space-y-3">
          {acciones.map((accion) => (
            <AccionItem key={accion.id} accion={accion} />
          ))}
        </div>
      )}
    </section>
  );
}
