'use client';

import Link from 'next/link';
import { type MetasGamificacion , formatearMoneda } from '@/types/cobranza';


interface MetaProgressPanelProps {
  metas: MetasGamificacion;
  titulo?: string;
  mostrarEnlaceConfig?: boolean;
}

function BarraProgreso({
  label,
  actual,
  meta,
  pct,
  cumplida,
  formatearValor,
}: {
  label: string;
  actual: number;
  meta: number;
  pct: number;
  cumplida: boolean;
  formatearValor: (n: number) => string;
}) {
  return (
    <div className="rounded-lg border p-4 dark:border-dark-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-dark dark:text-white">{label}</p>
        <span
          className={`text-xs font-semibold ${
            cumplida ? 'text-green-600' : 'text-gray-500'
          }`}
        >
          {cumplida ? 'Cumplida' : `${pct}%`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-2 dark:bg-dark-2">
        <div
          className={`h-full rounded-full transition-all ${
            cumplida ? 'bg-green-500' : 'bg-primary'
          }`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {formatearValor(actual)} / {formatearValor(meta)}
      </p>
    </div>
  );
}

export function MetaProgressPanel({
  metas,
  titulo = 'Metas semanales',
  mostrarEnlaceConfig = true,
}: MetaProgressPanelProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark dark:text-white">
          {titulo}
        </h2>
        {mostrarEnlaceConfig && (
          <Link
            href="/configuracion"
            className="text-sm text-primary hover:underline"
          >
            Configurar metas →
          </Link>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <BarraProgreso
          label="Gestiones semana"
          actual={metas.gestionesSemana}
          meta={metas.metaGestionesSemana}
          pct={metas.pctGestiones}
          cumplida={metas.metaGestionesCumplida}
          formatearValor={(n) => String(n)}
        />
        <BarraProgreso
          label="Recuperación semanal"
          actual={metas.recuperacionSemana}
          meta={metas.metaRecuperacionSemana}
          pct={metas.pctRecuperacion}
          cumplida={metas.metaRecuperacionCumplida}
          formatearValor={formatearMoneda}
        />
      </div>
    </section>
  );
}
