'use client';

interface HorarioAlertaProps {
  permitido: boolean;
  motivo?: string | null;
}

export function HorarioAlerta({ permitido, motivo }: HorarioAlertaProps) {
  if (permitido) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-900/20 dark:text-green-200">
        Horario de cobranza permitido en este momento.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
      <strong>Gestión bloqueada:</strong>{' '}
      {motivo ?? 'Fuera del horario legal de cobranza.'}
    </div>
  );
}
