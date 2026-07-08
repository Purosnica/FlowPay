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
        <label htmlFor={selectId} className="mb-1 block text-sm font-medium">
          {label}
          {required ? ' *' : ''}
        </label>
      ) : null}
      <select
        id={selectId}
        className={
          selectClassName ??
          'w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white'
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
