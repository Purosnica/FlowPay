'use client';

import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_IMPORTACION_JOBS } from '@/lib/graphql/queries/cobranza.queries';
import type { ImportacionJob } from '@/types/cobranza';

const IMPORT_QUERY_OPTIONS = {
  timeout: 120_000,
  suppressErrorToast: true,
} as const;

export function ImportacionJobsPanel() {
  const { data, isLoading, refetch } = useGraphQLQuery<{
    importacionJobs: ImportacionJob[];
  }>(
    GET_IMPORTACION_JOBS,
    { limite: 15 },
    {
      requestOptions: IMPORT_QUERY_OPTIONS,
      staleTime: 0,
      refetchInterval: (query) => {
        const jobs = query.state.data?.importacionJobs ?? [];
        const hayActivos = jobs.some(
          (j) => j.estado === 'PENDIENTE' || j.estado === 'PROCESANDO',
        );
        return hayActivos ? 5000 : false;
      },
    },
  );

  const jobs = data?.importacionJobs ?? [];
  const hayActivos = jobs.some(
    (j) => j.estado === 'PENDIENTE' || j.estado === 'PROCESANDO',
  );

  if (isLoading) {
    return <p className="text-sm text-gray-500">Cargando jobs...</p>;
  }

  return (
    <div className="rounded-lg border p-4 dark:border-dark-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Importaciones en cola</h2>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm text-primary hover:underline"
        >
          Actualizar
        </button>
      </div>
      {jobs.length === 0 && (
        <p className="text-sm text-gray-500">No hay importaciones recientes.</p>
      )}
      <ul className="space-y-2">
        {jobs.map((job) => (
          <li
            key={job.idjob}
            className="rounded border px-3 py-2 text-sm dark:border-dark-3"
          >
            <div className="flex justify-between gap-2">
              <span className="truncate font-medium">{job.nombreArchivo}</span>
              <span
                className={
                  job.estado === 'COMPLETADO'
                    ? 'text-green-600'
                    : job.estado === 'ERROR'
                      ? 'text-red-600'
                      : 'text-primary'
                }
              >
                {job.estado}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
              <div
                className="h-full bg-primary"
                style={{ width: `${job.progresoPct}%` }}
              />
            </div>
            {job.error && (
              <p className="mt-1 text-xs text-red-600">{job.error}</p>
            )}
          </li>
        ))}
      </ul>
      {hayActivos && (
        <p className="mt-2 text-xs text-gray-500">
          Procesando archivos grandes puede tardar varios minutos. El progreso se
          actualiza automáticamente; ignore avisos de timeout mientras el job
          siga en PROCESANDO.
        </p>
      )}
    </div>
  );
}
