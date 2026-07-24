'use client';

import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_IMPORTACION_JOBS } from '@/lib/graphql/queries/cobranza.queries';
import type { ImportacionJob } from '@/types/cobranza';

const IMPORT_QUERY_OPTIONS = {
  timeout: 120_000,
  suppressErrorToast: true,
} as const;

const ESTADOS_ACTIVOS = new Set(['PENDIENTE', 'PROCESANDO']);

export function ImportacionJobsPanel() {
  const { data, isLoading, refetch, isFetching } = useGraphQLQuery<{
    importacionJobs: ImportacionJob[];
  }>(
    GET_IMPORTACION_JOBS,
    { limite: 15, soloActivos: true },
    {
      requestOptions: IMPORT_QUERY_OPTIONS,
      staleTime: 0,
      refetchInterval: (query) => {
        const jobs = query.state.data?.importacionJobs ?? [];
        const hayActivos = jobs.some((j) => ESTADOS_ACTIVOS.has(j.estado));
        return hayActivos ? 5000 : false;
      },
    },
  );

  const jobs = (data?.importacionJobs ?? []).filter((j) =>
    ESTADOS_ACTIVOS.has(j.estado),
  );

  if (isLoading) {
    return (
      <p className="text-sm text-gray-500 dark:text-dark-6">
        Cargando cola de importación...
      </p>
    );
  }

  // Cola vacía: no ocupar espacio con historial de cargas terminadas.
  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-dark dark:text-white">
            Importaciones en cola
          </h2>
          <p className="text-xs text-gray-5 dark:text-dark-6">
            Solo jobs en proceso. El historial está en cargas de cartera.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="text-sm text-primary hover:underline disabled:opacity-60"
        >
          Actualizar
        </button>
      </div>
      <ul className="space-y-2">
        {jobs.map((job) => (
          <li
            key={job.idjob}
            className="rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3"
          >
            <div className="flex justify-between gap-2">
              <span className="truncate font-medium text-dark dark:text-white">
                {job.nombreArchivo}
              </span>
              <span className="shrink-0 text-primary">{job.estado}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${Math.min(100, Math.max(0, job.progresoPct))}%` }}
              />
            </div>
            {job.filasTotales != null && job.filasTotales > 0 ? (
              <p className="mt-1 text-xs text-gray-5 dark:text-dark-6">
                {job.filasProcesadas ?? 0} / {job.filasTotales} filas
              </p>
            ) : null}
            {job.error ? (
              <p className="mt-1 text-xs text-red-600">{job.error}</p>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-gray-5 dark:text-dark-6">
        Archivos grandes pueden tardar varios minutos. El progreso se actualiza
        solo; ignore avisos de timeout mientras el job siga en PROCESANDO.
      </p>
    </div>
  );
}
