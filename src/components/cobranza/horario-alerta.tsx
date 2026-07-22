'use client';

import { LEY_787 } from '@/lib/compliance/ley-787-microcopy';
import { cn } from '@/lib/utils';

interface HorarioAlertaProps {
  permitido: boolean;
  motivo?: string | null;
  /** Mayor saliencia visual (I185). */
  prominente?: boolean;
  className?: string;
}

export function HorarioAlerta({
  permitido,
  motivo,
  prominente = true,
  className,
}: HorarioAlertaProps) {
  if (permitido) {
    return (
      <div
        role="status"
        className={cn(
          'rounded-lg border text-sm font-medium',
          prominente
            ? 'border-green-400 bg-green-100 p-4 text-base text-green-950 shadow-sm dark:border-green-600 dark:bg-green-900/40 dark:text-green-50'
            : 'border-green-200 bg-green-50 p-3 text-green-800 dark:border-green-900 dark:bg-green-900/20 dark:text-green-200',
          className,
        )}
      >
        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-green-600 dark:bg-green-400" />
        {LEY_787.horarioPermitido}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border font-medium',
        prominente
          ? 'border-amber-500 bg-amber-100 p-4 text-base text-amber-950 shadow-md ring-2 ring-amber-400/60 dark:border-amber-500 dark:bg-amber-900/40 dark:text-amber-50 dark:ring-amber-600/50'
          : 'border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200',
        className,
      )}
    >
      <strong>{LEY_787.horarioBloqueadoPrefijo}</strong>{' '}
      {motivo ?? LEY_787.horarioBloqueadoFallback}
    </div>
  );
}
