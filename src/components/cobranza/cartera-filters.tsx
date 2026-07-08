'use client';

import { useId } from 'react';
import type { PrestamoFilters } from '@/types/cobranza';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { ESTADOS_PRESTAMO } from '@/lib/cobranza/estado-prestamo-service';

interface CarteraFiltersProps {
  filters: PrestamoFilters;
  onChange: (filters: PrestamoFilters) => void;
  onReset: () => void;
}

export function CarteraFilters({
  filters,
  onChange,
  onReset,
}: CarteraFiltersProps) {
  const estadoId = useId();
  const buscarId = useId();

  return (
    <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
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
          selectClassName="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />

        <div>
          <label
            htmlFor={estadoId}
            className="mb-1 block text-sm font-medium text-dark dark:text-white"
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
            className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
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
            className="mb-1 block text-sm font-medium text-dark dark:text-white"
          >
            Buscar
          </label>
          <input
            id={buscarId}
            type="text"
            placeholder="No. préstamo o código único..."
            value={filters.search ?? ''}
            onChange={(e) =>
              onChange({ ...filters, search: e.target.value || undefined })
            }
            className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-primary hover:underline"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
