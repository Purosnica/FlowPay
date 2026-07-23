'use client';

import { useId } from 'react';
import { Button } from '@/components/ui/button';
import type { PrestamoFilters } from '@/types/cobranza';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { ESTADOS_PRESTAMO } from '@/lib/cobranza/estado-prestamo-service';

interface CarteraFiltersProps {
  filters: PrestamoFilters;
  onChange: (filters: PrestamoFilters) => void;
  onReset: () => void;
}

const CONTROL_CLASS =
  'field-touch-target w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary';

export function CarteraFilters({
  filters,
  onChange,
  onReset,
}: CarteraFiltersProps) {
  const estadoId = useId();
  const buscarId = useId();

  return (
    <div className="rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MandanteSelect
          value={filters.idmandante ?? ''}
          onChange={(value) =>
            onChange({
              ...filters,
              idmandante: value === '' ? undefined : value,
            })
          }
          allowAll
          allLabel="Todos (permitidos)"
          selectClassName={CONTROL_CLASS}
        />

        <div>
          <label
            htmlFor={estadoId}
            className="mb-1.5 block text-sm font-medium text-dark dark:text-white"
          >
            Estado
          </label>
          <select
            id={estadoId}
            value={filters.estado ?? ''}
            onChange={(e) =>
              onChange({
                ...filters,
                estado: e.target.value || undefined,
              })
            }
            className={CONTROL_CLASS}
          >
            <option value="">Todos</option>
            {ESTADOS_PRESTAMO.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor={buscarId}
            className="mb-1.5 block text-sm font-medium text-dark dark:text-white"
          >
            Buscar
          </label>
          <input
            id={buscarId}
            type="search"
            placeholder="No. préstamo, código o deudor..."
            value={filters.search ?? ''}
            onChange={(e) =>
              onChange({ ...filters, search: e.target.value || undefined })
            }
            className={CONTROL_CLASS}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="field-touch-target text-primary"
          onClick={onReset}
        >
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
