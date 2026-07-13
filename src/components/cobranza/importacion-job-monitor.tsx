'use client';

import { useEffect, useRef, useState } from 'react';

interface JobEstado {
  idjob: number;
  estado: string;
  progresoPct: number;
  filasProcesadas: number;
  filasTotales: number;
  error: string | null;
  nombreArchivo: string;
}

interface ImportacionJobMonitorProps {
  idjob: number;
  onCompletado?: () => void;
}

const POLL_INTERVAL_MS = 3000;
const JOB_FETCH_TIMEOUT_MS = 120_000;

export function ImportacionJobMonitor({
  idjob,
  onCompletado,
}: ImportacionJobMonitorProps) {
  const [job, setJob] = useState<JobEstado | null>(null);
  const estadoRef = useRef<string | null>(null);

  useEffect(() => {
    estadoRef.current = job?.estado ?? null;
  }, [job?.estado]);

  useEffect(() => {
    let activo = true;

    const consultar = async () => {
      if (
        estadoRef.current === 'COMPLETADO' ||
        estadoRef.current === 'ERROR'
      ) {
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        JOB_FETCH_TIMEOUT_MS,
      );

      try {
        const res = await fetch(`/api/cobranza/importar/jobs/${idjob}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        const json = (await res.json()) as {
          success: boolean;
          job?: JobEstado;
        };
        if (activo && json.success && json.job) {
          setJob(json.job);
          estadoRef.current = json.job.estado;
          if (
            json.job.estado === 'COMPLETADO' ||
            json.job.estado === 'ERROR'
          ) {
            onCompletado?.();
          }
        }
      } catch {
        // polling silencioso: el servidor puede estar ocupado procesando
      } finally {
        clearTimeout(timeoutId);
      }
    };

    void consultar();
    const interval = setInterval(() => {
      void consultar();
    }, POLL_INTERVAL_MS);

    return () => {
      activo = false;
      clearInterval(interval);
    };
  }, [idjob, onCompletado]);

  if (!job) {
    return <p className="text-sm text-gray-500">Consultando job #{idjob}...</p>;
  }

  return (
    <div className="rounded-lg border bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium">{job.nombreArchivo}</span>
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
      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${job.progresoPct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {job.filasProcesadas} / {job.filasTotales || '—'} filas · {job.progresoPct}%
      </p>
      {job.estado === 'PROCESANDO' && job.progresoPct <= 15 && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Leyendo y procesando el archivo. Con volúmenes grandes puede demorar
          varios minutos sin cambiar el porcentaje.
        </p>
      )}
      {job.error && (
        <p className="mt-2 text-sm text-red-600">{job.error}</p>
      )}
    </div>
  );
}
