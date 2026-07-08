'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import {
  GET_AUDITORIA,
  GET_AUDITORIA_RESUMEN,
} from '@/lib/graphql/queries/cobranza.queries';
import { TablePagination } from '@/components/cobranza/data-table';
import { usePagination } from '@/hooks/use-pagination';
import {
  ACCIONES_AUDITORIA,
  ENTIDADES_AUDITORIA,
} from '@/lib/cobranza/auditoria-query-service';
import { SearchParamsBoundary } from '@/components/ui/search-params-boundary';

function entidadLink(entidad: string, entidadId: number | null): string | null {
  if (entidadId == null) {
    return null;
  }
  if (entidad === 'prestamo') {
    return `/cobranza/prestamos/${entidadId}`;
  }
  return null;
}

function AuditoriaPageContent() {
  const searchParams = useSearchParams();
  const [entidad, setEntidad] = useState(searchParams.get('entidad') ?? '');
  const [accion, setAccion] = useState('');
  const [entidadId, setEntidadId] = useState(
    searchParams.get('entidadId') ?? '',
  );
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const { queryVars, handlePageChange, handlePageSizeChange } = usePagination({
    initialPageSize: 20,
  });

  const { data: resumenData } = useGraphQLQuery<{
    auditoriaResumen: {
      total24h: number;
      total7d: number;
      topEntidades: Array<{ entidad: string; cantidad: number }>;
    };
  }>(GET_AUDITORIA_RESUMEN);

  const { data, isLoading, error } = useGraphQLQuery<{
    auditoria: {
      filas: Array<{
        idauditoria: number;
        entidad: string;
        entidadId: number | null;
        accion: string;
        detalle: string | null;
        usuario: string | null;
        createdAt: string;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_AUDITORIA, {
    ...queryVars,
    entidad: entidad || undefined,
    accion: accion || undefined,
    entidadId: entidadId ? Number(entidadId) : undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  });

  const page = data?.auditoria;
  const resumen = resumenData?.auditoriaResumen;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Auditoría del sistema
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Trazabilidad de acciones críticas con filtros y drill-down a entidades.
        </p>
      </div>

      {resumen && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-4 dark:border-dark-3">
            <p className="text-xs text-gray-500">Eventos (24h)</p>
            <p className="text-2xl font-bold">{resumen.total24h}</p>
          </div>
          <div className="rounded-lg border p-4 dark:border-dark-3">
            <p className="text-xs text-gray-500">Eventos (7 días)</p>
            <p className="text-2xl font-bold">{resumen.total7d}</p>
          </div>
          <div className="rounded-lg border p-4 dark:border-dark-3">
            <p className="text-xs text-gray-500">Top entidades (7d)</p>
            <ul className="mt-1 space-y-1 text-sm">
              {resumen.topEntidades.map((t) => (
                <li key={t.entidad}>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setEntidad(t.entidad)}
                  >
                    {t.entidad}
                  </button>
                  : {t.cantidad}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={entidad}
          onChange={(e) => setEntidad(e.target.value)}
          className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        >
          <option value="">Todas las entidades</option>
          {ENTIDADES_AUDITORIA.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select
          value={accion}
          onChange={(e) => setAccion(e.target.value)}
          className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        >
          <option value="">Todas las acciones</option>
          {ACCIONES_AUDITORIA.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="ID entidad"
          value={entidadId}
          onChange={(e) => setEntidadId(e.target.value)}
          className="w-32 rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        />
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        />
        <input
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">
          Sin permisos o error al cargar auditoría.
        </p>
      )}

      {isLoading && <p className="text-sm text-gray-500">Cargando...</p>}

      {page && (
        <>
          <p className="text-sm text-gray-500">
            {page.total} registro(s) encontrados
          </p>
          <div className="overflow-x-auto rounded-lg border dark:border-dark-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left dark:border-dark-3 dark:bg-dark-2">
                  <th className="p-3">Fecha</th>
                  <th>Usuario</th>
                  <th>Entidad</th>
                  <th>Acción</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {page.filas.map((f) => {
                  const link = entidadLink(f.entidad, f.entidadId);
                  return (
                    <tr key={f.idauditoria} className="border-b dark:border-dark-3">
                      <td className="p-3 whitespace-nowrap">
                        {new Date(f.createdAt).toLocaleString('es-NI')}
                      </td>
                      <td>{f.usuario ?? '—'}</td>
                      <td>
                        {link ? (
                          <Link
                            href={link}
                            className="text-primary hover:underline"
                          >
                            {f.entidad} #{f.entidadId}
                          </Link>
                        ) : (
                          <>
                            {f.entidad}
                            {f.entidadId != null ? ` #${f.entidadId}` : ''}
                          </>
                        )}
                      </td>
                      <td>{f.accion}</td>
                      <td className="max-w-md truncate text-gray-500" title={f.detalle ?? undefined}>
                        {f.detalle ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            totalPages={page.totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}
    </div>
  );
}

export default function AuditoriaPage() {
  return (
    <SearchParamsBoundary>
      <AuditoriaPageContent />
    </SearchParamsBoundary>
  );
}
