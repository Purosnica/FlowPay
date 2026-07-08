'use client';

import { useEffect, useState } from 'react';

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

export function ImportacionJobMonitor({
  idjob,
  onCompletado,
}: ImportacionJobMonitorProps) {
  const [job, setJob] = useState<JobEstado | null>(null);

  useEffect(() => {
    let activo = true;

    const consultar = async () => {
      try {
        const res = await fetch(`/api/cobranza/importar/jobs/${idjob}`, {
          credentials: 'include',
        });
        const json = (await res.json()) as {
          success: boolean;
          job?: JobEstado;
        };
        if (activo && json.success && json.job) {
          setJob(json.job);
          if (
            json.job.estado === 'COMPLETADO' ||
            json.job.estado === 'ERROR'
          ) {
            onCompletado?.();
          }
        }
      } catch {
        // polling silencioso
      }
    };

    void consultar();
    const interval = setInterval(() => {
      if (job?.estado === 'COMPLETADO' || job?.estado === 'ERROR') {
        return;
      }
      void consultar();
    }, 3000);

    return () => {
      activo = false;
      clearInterval(interval);
    };
  }, [idjob, job?.estado, onCompletado]);

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
      {job.error && (
        <p className="mt-2 text-sm text-red-600">{job.error}</p>
      )}
    </div>
  );
}
