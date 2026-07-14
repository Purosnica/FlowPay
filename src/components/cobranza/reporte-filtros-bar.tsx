'use client';

import type { ReactNode } from 'react';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FILTER_INPUT_CLASS =
  'w-full rounded border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white';

interface ReporteFiltrosBarProps {
  idmandante: number | '';
  onMandanteChange: (value: number | '') => void;
  /** When false, hides MandanteSelect (e.g. reportes globales). */
  showMandante?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  canExport?: boolean;
  isFetching?: boolean;
  exportOk?: string | null;
  exportError?: string | null;
  periodo?: string;
  onPeriodoChange?: (value: string) => void;
  periodoId?: string;
  children?: ReactNode;
  className?: string;
}

export function ReporteFiltrosBar({
  idmandante,
  onMandanteChange,
  showMandante = true,
  onRefresh,
  onExport,
  canExport = false,
  isFetching = false,
  exportOk = null,
  exportError = null,
  periodo,
  onPeriodoChange,
  periodoId = 'periodo-reporte',
  children,
  className,
}: ReporteFiltrosBarProps) {
  const showPeriodo = periodo !== undefined && onPeriodoChange !== undefined;

  return (
    <div
      className={cn(
        'rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark',
        className,
      )}
    >
      <div className="flex flex-wrap items-end gap-3">
        {showMandante ? (
          <MandanteSelect
            value={idmandante}
            onChange={onMandanteChange}
            required
            className="min-w-[220px]"
            selectClassName={FILTER_INPUT_CLASS}
          />
        ) : null}
        {showPeriodo ? (
          <div>
            <label
              htmlFor={periodoId}
              className="mb-1 block text-sm font-medium text-dark dark:text-white"
            >
              Periodo
            </label>
            <input
              id={periodoId}
              type="month"
              value={periodo}
              onChange={(e) => onPeriodoChange(e.target.value)}
              className={FILTER_INPUT_CLASS}
            />
          </div>
        ) : null}
        {children}
        {onRefresh ? (
          <Button
            type="button"
            variant="outline"
            disabled={
              isFetching || (showMandante && idmandante === '')
            }
            onClick={onRefresh}
          >
            {isFetching ? 'Actualizando…' : 'Actualizar'}
          </Button>
        ) : null}
        {onExport ? (
          <Button type="button" disabled={!canExport} onClick={onExport}>
            Exportar Excel
          </Button>
        ) : null}
      </div>
      {exportOk ? (
        <p
          className="mt-3 text-sm text-green-700 dark:text-green-400"
          role="status"
        >
          {exportOk}
        </p>
      ) : null}
      {exportError ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {exportError}
        </p>
      ) : null}
    </div>
  );
}

export { FILTER_INPUT_CLASS };
