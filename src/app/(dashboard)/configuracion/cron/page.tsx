'use client';

import { useState } from 'react';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  EJECUTAR_CRON_OPERACIONES,
  GET_CRON_EJECUCIONES,
  GET_CRON_MONITOR,
  RECALCULAR_MORA_CARTERA,
} from '@/lib/graphql/queries/cobranza.queries';
import { TablePagination } from '@/components/cobranza/data-table';
import { usePagination } from '@/hooks/use-pagination';

function formatoFecha(fecha: string | null | undefined): string {
  if (!fecha) {
    return '—';
  }
  return new Date(fecha).toLocaleString('es-NI');
}

function formatoDuracion(ms: number | null | undefined): string {
  if (ms == null) {
    return '—';
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function badgeEstado(estado: string | null | undefined): string {
  switch (estado) {
    case 'OK':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'ERROR':
    case 'TIMEOUT':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'PARCIAL':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'EN_CURSO':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'OMITIDO':
      return 'bg-gray-100 text-gray-700 dark:bg-dark-3 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-dark-3 dark:text-gray-300';
  }
}

export default function CronMonitorPage() {
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const { queryVars, handlePageChange, handlePageSizeChange } = usePagination({
    initialPageSize: 20,
  });

  const { data, isLoading, error, refetch } = useGraphQLQuery<{
    cronMonitor: {
      estadisticas: {
        totalJobs: number;
        jobsActivos: number;
        ejecucionesOk24h: number;
        ejecucionesError24h: number;
        ultimaEjecucionGlobal: string | null;
      };
      jobs: Array<{
        codigo: string;
        nombre: string;
        schedule: string | null;
        activo: boolean;
        ultimaEjecucion: string | null;
        proximaEjecucion: string | null;
        ultimoEstado: string | null;
        timeoutMs: number;
        maxReintentos: number;
      }>;
      ejecucionesRecientes: Array<{
        idejecucion: number;
        codigoJob: string;
        nombreJob: string;
        estado: string;
        intento: number;
        trigger: string;
        iniciadoEn: string;
        finalizadoEn: string | null;
        duracionMs: number | null;
        registrosProcesados: number;
        error: string | null;
      }>;
    };
  }>(GET_CRON_MONITOR);

  const { data: ejecData, isLoading: loadingEjec } = useGraphQLQuery<{
    cronEjecuciones: {
      filas: Array<{
        idejecucion: number;
        codigoJob: string;
        nombreJob: string;
        estado: string;
        intento: number;
        trigger: string;
        iniciadoEn: string;
        finalizadoEn: string | null;
        duracionMs: number | null;
        registrosProcesados: number;
        error: string | null;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_CRON_EJECUCIONES, {
    ...queryVars,
    estado: estadoFiltro || undefined,
  });

  const ejecutarMutation = useGraphQLMutation<
    { ejecutarCronOperaciones: { estado: string; errores: number } },
    Record<string, never>
  >(EJECUTAR_CRON_OPERACIONES, {
    successMessage: 'Cron ejecutado correctamente',
  });

  const recalcularMoraMutation = useGraphQLMutation<
    {
      recalcularMoraCartera: {
        evaluados: number;
        actualizados: number;
      };
    },
    { idmandante?: number }
  >(RECALCULAR_MORA_CARTERA, {
    successMessage: 'Mora recalculada correctamente',
  });

  const monitor = data?.cronMonitor;
  const ejecuciones = ejecData?.cronEjecuciones;

  const handleEjecutarManual = async () => {
    await ejecutarMutation.mutateAsync({});
    await refetch();
  };

  const handleRecalcularMora = async () => {
    await recalcularMoraMutation.mutateAsync({});
    await refetch();
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            Cron operativo
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitoreo de procesos programados, historial y ejecución manual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRecalcularMora}
            disabled={recalcularMoraMutation.isPending}
            className="rounded-lg border-2 border-primary bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary hover:text-white disabled:opacity-50 dark:bg-dark-2"
          >
            {recalcularMoraMutation.isPending
              ? 'Recalculando mora…'
              : 'Recalcular mora'}
          </button>
          <button
            type="button"
            onClick={handleEjecutarManual}
            disabled={ejecutarMutation.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50"
          >
            {ejecutarMutation.isPending ? 'Ejecutando…' : 'Ejecutar ahora'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          Sin permisos o error al cargar el monitor de cron.
        </p>
      )}

      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}

      {monitor && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4 dark:border-dark-3">
              <p className="text-xs text-gray-500">Jobs activos</p>
              <p className="text-2xl font-bold">
                {monitor.estadisticas.jobsActivos}/
                {monitor.estadisticas.totalJobs}
              </p>
            </div>
            <div className="rounded-lg border p-4 dark:border-dark-3">
              <p className="text-xs text-gray-500">OK (24h)</p>
              <p className="text-2xl font-bold text-green-600">
                {monitor.estadisticas.ejecucionesOk24h}
              </p>
            </div>
            <div className="rounded-lg border p-4 dark:border-dark-3">
              <p className="text-xs text-gray-500">Errores (24h)</p>
              <p className="text-2xl font-bold text-red-600">
                {monitor.estadisticas.ejecucionesError24h}
              </p>
            </div>
            <div className="rounded-lg border p-4 dark:border-dark-3">
              <p className="text-xs text-gray-500">Última ejecución</p>
              <p className="text-sm font-medium">
                {formatoFecha(monitor.estadisticas.ultimaEjecucionGlobal)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border dark:border-dark-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 dark:border-dark-3 dark:bg-dark-2">
                  <th className="px-3 py-2 text-left">Job</th>
                  <th className="px-3 py-2 text-left">Schedule</th>
                  <th className="px-3 py-2 text-left">Última</th>
                  <th className="px-3 py-2 text-left">Próxima</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Timeout</th>
                  <th className="px-3 py-2 text-left">Reintentos</th>
                </tr>
              </thead>
              <tbody>
                {monitor.jobs.map((job) => (
                  <tr
                    key={job.codigo}
                    className="border-b dark:border-dark-3"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium">{job.nombre}</div>
                      <div className="text-xs text-gray-500">{job.codigo}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {job.schedule ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      {formatoFecha(job.ultimaEjecucion)}
                    </td>
                    <td className="px-3 py-2">
                      {formatoFecha(job.proximaEjecucion)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${badgeEstado(job.ultimoEstado)}`}
                      >
                        {job.ultimoEstado ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {formatoDuracion(job.timeoutMs)}
                    </td>
                    <td className="px-3 py-2">{job.maxReintentos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-dark dark:text-white">
            Historial de ejecuciones
          </h2>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="rounded border px-2 py-1 text-sm dark:border-dark-3 dark:bg-dark-2"
          >
            <option value="">Todos los estados</option>
            <option value="OK">OK</option>
            <option value="ERROR">ERROR</option>
            <option value="TIMEOUT">TIMEOUT</option>
            <option value="PARCIAL">PARCIAL</option>
            <option value="OMITIDO">OMITIDO</option>
            <option value="EN_CURSO">EN_CURSO</option>
          </select>
        </div>

        {loadingEjec && (
          <p className="text-sm text-gray-500">Cargando historial…</p>
        )}

        {ejecuciones && (
          <>
            <div className="overflow-x-auto rounded-lg border dark:border-dark-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:border-dark-3 dark:bg-dark-2">
                    <th className="px-3 py-2 text-left">Job</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-left">Inicio</th>
                    <th className="px-3 py-2 text-left">Fin</th>
                    <th className="px-3 py-2 text-left">Duración</th>
                    <th className="px-3 py-2 text-left">Registros</th>
                    <th className="px-3 py-2 text-left">Intento</th>
                    <th className="px-3 py-2 text-left">Trigger</th>
                    <th className="px-3 py-2 text-left">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {ejecuciones.filas.map((e) => (
                    <tr
                      key={e.idejecucion}
                      className="border-b dark:border-dark-3"
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium">{e.nombreJob}</div>
                        <div className="text-xs text-gray-500">
                          {e.codigoJob}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${badgeEstado(e.estado)}`}
                        >
                          {e.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {formatoFecha(e.iniciadoEn)}
                      </td>
                      <td className="px-3 py-2">
                        {formatoFecha(e.finalizadoEn)}
                      </td>
                      <td className="px-3 py-2">
                        {formatoDuracion(e.duracionMs)}
                      </td>
                      <td className="px-3 py-2">{e.registrosProcesados}</td>
                      <td className="px-3 py-2">{e.intento}</td>
                      <td className="px-3 py-2">{e.trigger}</td>
                      <td
                        className="max-w-xs truncate px-3 py-2 text-red-600"
                        title={e.error ?? undefined}
                      >
                        {e.error ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={ejecuciones.page}
              pageSize={ejecuciones.pageSize}
              total={ejecuciones.total}
              totalPages={ejecuciones.totalPages}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
