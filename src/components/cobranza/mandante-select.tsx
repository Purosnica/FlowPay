'use client';

import { useId } from 'react';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_MANDANTES } from '@/lib/graphql/queries/cobranza.queries';
import type { Mandante } from '@/types/cobranza';

interface MandanteSelectProps {
  value: number | '';
  onChange: (value: number | '', mandante?: Mandante) => void;
  label?: string;
  required?: boolean;
  allowAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  className?: string;
  selectClassName?: string;
  mandantes?: Mandante[];
  disabled?: boolean;
  id?: string;
}

export function MandanteSelect({
  value,
  onChange,
  label = 'Mandante',
  required = false,
  allowAll = false,
  allLabel = 'Todos mis mandantes',
  placeholder = 'Seleccione...',
  className,
  selectClassName,
  mandantes: mandantesProp,
  disabled = false,
  id: idProp,
}: MandanteSelectProps) {
  const generatedId = useId();
  const selectId = idProp ?? generatedId;

  const { data, isLoading } = useGraphQLQuery<{
    mandantes: { mandantes: Mandante[] };
  }>(GET_MANDANTES, { page: 1, pageSize: 100 }, { enabled: !mandantesProp });

  const mandantes = mandantesProp ?? data?.mandantes.mandantes ?? [];

  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-dark dark:text-white"
        >
          {label}
          {required ? (
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <select
        id={selectId}
        className={
          selectClassName ??
          'field-touch-target w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary'
        }
        value={value}
        disabled={disabled || (isLoading && !mandantesProp)}
        onChange={(e) => {
          const nextValue = e.target.value ? Number(e.target.value) : '';
          const mandante =
            nextValue === ''
              ? undefined
              : mandantes.find((m) => m.idmandante === nextValue);
          onChange(nextValue, mandante);
        }}
      >
        {allowAll ? (
          <option value="">{allLabel}</option>
        ) : (
          <option value="">{isLoading ? 'Cargando...' : placeholder}</option>
        )}
        {mandantes.map((m) => (
          <option key={m.idmandante} value={m.idmandante}>
            {m.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
