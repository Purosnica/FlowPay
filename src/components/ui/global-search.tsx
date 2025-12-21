"use client";

import { useState, useEffect, useRef } from "react";
import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import { SearchIcon } from "@/assets/icons";
import { Input } from "./input";
import Link from "next/link";
import { BUSCAR_GLOBAL } from "@/lib/graphql/queries/search.queries";

interface SearchResult {
  buscarGlobal: {
    total: number;
    clientes: Array<{
      tipo: string;
      id: number;
      codigo: string;
      nombre: string;
      subtitulo: string;
      metadata: string | null;
    }>;
    prestamos: Array<{
      tipo: string;
      id: number;
      codigo: string;
      nombre: string;
      subtitulo: string;
      metadata: string | null;
    }>;
  };
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data, isLoading } = useGraphQLQuery<SearchResult>(
    BUSCAR_GLOBAL,
    { query: debouncedQuery, limite: 5 },
    {
      enabled: debouncedQuery.length >= 2,
      staleTime: 5000,
    }
  );

  const results = data?.buscarGlobal;
  const hasResults = results && results.total > 0;
  const showResults = isOpen && debouncedQuery.length >= 2;

  const handleSelect = () => {
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Input
          type="text"
          placeholder="Buscar clientes, préstamos..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10"
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {showResults && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Buscando...
            </div>
          ) : hasResults ? (
            <>
              {results.clientes.length > 0 && (
                <div className="border-b border-stroke dark:border-dark-3">
                  <div className="px-3 py-2 text-xs font-semibold uppercase text-gray-500">
                    Clientes ({results.clientes.length})
                  </div>
                  {results.clientes.map((item) => (
                    <Link
                      key={`cliente-${item.id}`}
                      href={`/clientes?id=${item.id}`}
                      onClick={handleSelect}
                      className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-dark-3"
                    >
                      <div className="font-medium text-dark dark:text-white">
                        {item.nombre}
                      </div>
                      <div className="text-xs text-gray-500">{item.subtitulo}</div>
                    </Link>
                  ))}
                </div>
              )}

              {results.prestamos.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold uppercase text-gray-500">
                    Préstamos ({results.prestamos.length})
                  </div>
                  {results.prestamos.map((item) => (
                    <Link
                      key={`prestamo-${item.id}`}
                      href={`/prestamos?id=${item.id}`}
                      onClick={handleSelect}
                      className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-dark-3"
                    >
                      <div className="font-medium text-dark dark:text-white">
                        {item.nombre}
                      </div>
                      <div className="text-xs text-gray-500">{item.subtitulo}</div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              No se encontraron resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}

