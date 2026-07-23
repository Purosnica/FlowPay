'use client';

import { useEffect, useState } from 'react';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_CLIENTES } from '@/lib/graphql/queries/cliente.queries';
import { formatNombreClienteDisplay } from '@/lib/logic/cliente-tipo-persona-logic';

export interface ClienteBusquedaItem {
  idcliente: number;
  primer_nombres: string;
  segundo_nombres?: string | null;
  primer_apellido: string | null;
  segundo_apellido?: string | null;
  razon_social?: string | null;
  nombre_comercial?: string | null;
  numerodocumento: string;
  celular?: string | null;
}

interface ClienteBuscarInputProps {
  onSelect: (cliente: ClienteBusquedaItem) => void;
  placeholder?: string;
}

export function ClienteBuscarInput({
  onSelect,
  placeholder = 'Buscar por cédula o nombre...',
}: ClienteBuscarInputProps) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading } = useGraphQLQuery<{
    clientes: { clientes: ClienteBusquedaItem[] };
  }>(
    GET_CLIENTES,
    {
      page: 1,
      pageSize: 8,
      filters: debounced.length >= 2 ? { search: debounced } : undefined,
    },
    { enabled: debounced.length >= 2 },
  );

  const resultados = data?.clientes.clientes ?? [];

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
      />
      {debounced.length >= 2 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border bg-white shadow dark:border-dark-3 dark:bg-gray-dark">
          {isLoading && (
            <li className="px-3 py-2 text-sm text-gray-500">Buscando...</li>
          )}
          {!isLoading && resultados.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">Sin resultados</li>
          )}
          {resultados.map((c) => {
            const nombre = formatNombreClienteDisplay(c);
            return (
              <li key={c.idcliente}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-2"
                  onClick={() => {
                    onSelect(c);
                    setQuery(`${nombre} (${c.numerodocumento})`);
                  }}
                >
                  {nombre} — {c.numerodocumento}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
