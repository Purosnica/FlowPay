'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { MetasCobradorModal } from '@/components/cobranza/metas-cobrador-modal';
import { EquipoRankingChart } from '@/components/cobranza/equipo-ranking-chart';
import { EquipoSupervisoresChart } from '@/components/cobranza/equipo-supervisores-chart';
import { Button } from '@/components/ui/button';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { DashboardForecastStrip } from '@/components/dashboard/dashboard-forecast-strip';
import {
  GET_DASHBOARD_SUPERVISOR,
  GET_DASHBOARD_GERENTE,
  GET_FORECAST_RECUPERACION,
  GET_METAS_GAMIFICACION,
} from '@/lib/graphql/queries/cobranza.queries';
import { useEsGerente } from '@/hooks/use-rol';
import {
  type DashboardSupervisorResumen,
  type MetasGamificacion,
  formatearMoneda,
} from '@/types/cobranza';

function MetaBar({
  label,
  actual,
  meta,
  pct,
  cumplida,
  formatear,
}: {
  label: string;
  actual: number;
  meta: number;
  pct: number;
  cumplida: boolean;
  formatear: (n: number) => string;
}) {
  return (
    <div className="min-w-0 px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-5">
          {label}
        </p>
        <span
          className={`shrink-0 text-xs font-semibold ${
            cumplida ? 'text-green-dark' : 'text-primary'
          }`}
        >
          {cumplida ? 'OK' : `${pct}%`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-2 dark:bg-dark-2">
        <div
          className={`h-full rounded-full ${
            cumplida ? 'bg-green' : 'bg-primary'
          }`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="mt-1.5 truncate text-xs text-gray-5">
        {formatear(actual)} / {formatear(meta)}
      </p>
    </div>
  );
}

export default function EquipoPage() {
  const esGerente = useEsGerente();
  const [metasCobradorId, setMetasCobradorId] = useState<number | null>(null);
  const [metasCobradorNombre, setMetasCobradorNombre] = useState('');

  const { data, isLoading, error } = useGraphQLQuery<{
    dashboardSupervisor: DashboardSupervisorResumen;
  }>(GET_DASHBOARD_SUPERVISOR, undefined, { enabled: !esGerente });

  const { data: dataGerente, isLoading: loadingGerente } = useGraphQLQuery<{
    dashboardGerente: {
      totalSupervisores: number;
      totalCobradores: number;
      gestionesHoy: number;
      montoRecuperadoMes: number;
      reclamosFueraSla: number;
      carteraTotal: number;
      carteraEnMoraPct: number;
      equipos: Array<{
        idsupervisor: number;
        nombreSupervisor: string;
        cobradores: number;
        gestionesHoy: number;
        montoRecuperadoMes: number;
      }>;
    };
  }>(GET_DASHBOARD_GERENTE, undefined, { enabled: esGerente });

  const { data: forecastData } = useGraphQLQuery<{
    forecastRecuperacion: {
      recuperadoMesActual: number;
      runRateDiario: number;
      forecastFinMes: number;
      diasRestantesMes: number;
      metaMes: number | null;
      pctMeta: number | null;
    };
  }>(GET_FORECAST_RECUPERACION);

  const { data: metasData } = useGraphQLQuery<{
    metasGamificacion: MetasGamificacion;
  }>(GET_METAS_GAMIFICACION, undefined, { enabled: !esGerente });

  const d = data?.dashboardSupervisor;
  const g = dataGerente?.dashboardGerente;
  const forecast = forecastData?.forecastRecuperacion;
  const metas = metasData?.metasGamificacion;

  const gerenteMetrics: DashboardMetric[] = g
    ? [
        {
          label: 'Supervisores',
          value: String(g.totalSupervisores),
          tone: 'primary',
        },
        {
          label: 'Cobradores',
          value: String(g.totalCobradores),
        },
        {
          label: 'Gestiones hoy',
          value: String(g.gestionesHoy),
          href: '/cobranza/gestiones',
        },
        {
          label: 'Recuperado mes',
          value: formatearMoneda(g.montoRecuperadoMes),
          tone: 'success',
        },
        {
          label: 'Cartera total',
          value: formatearMoneda(g.carteraTotal),
          tone: 'primary',
        },
        {
          label: 'Saldo en mora',
          value: `${g.carteraEnMoraPct}%`,
          sub: 'Por saldo',
          href: '/cobranza/reportes',
          tone: g.carteraEnMoraPct > 30 ? 'warning' : 'default',
        },
        {
          label: 'Reclamos SLA',
          value: String(g.reclamosFueraSla),
          href: '/cobranza/reclamos',
          tone: g.reclamosFueraSla > 0 ? 'danger' : 'default',
        },
      ]
    : [];

  const supervisorMetrics: DashboardMetric[] = d
    ? [
        {
          label: 'Cobradores',
          value: String(d.totalCobradores),
          tone: 'primary',
        },
        {
          label: 'Gestiones hoy',
          value: String(d.gestionesHoy),
          sub: `Ayer: ${d.gestionesAyer}`,
          href: '/cobranza/gestiones',
        },
        {
          label: 'Recuperado mes',
          value: formatearMoneda(d.montoRecuperadoMes),
          tone: 'success',
        },
        {
          label: 'Promesas vencidas',
          value: String(d.promesasVencidasEquipo),
          href: '/cobranza/bandeja?soloPromesaVencida=1',
          tone: d.promesasVencidasEquipo > 0 ? 'warning' : 'default',
        },
        {
          label: 'Sin gestión 7+d',
          value: String(d.casosSinGestion7d),
          href: '/cobranza/bandeja?soloSinGestion=1',
          tone: d.casosSinGestion7d > 0 ? 'danger' : 'default',
        },
        ...(d.tasaContactoEquipoPct != null
          ? [
              {
                label: 'Tasa contacto',
                value: `${d.tasaContactoEquipoPct}%`,
                tone: 'primary' as const,
              },
            ]
          : []),
      ]
    : [];

  const cargando =
    (isLoading && !esGerente) || (loadingGerente && esGerente && !g);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            Mi equipo
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Productividad, alertas y ranking operativo
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/cobranza/bandeja?preset=inbox_operativo"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            Inbox
          </Link>
          <Link
            href="/cobranza/bandeja?soloPromesaVencida=1"
            className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
          >
            Promesas
          </Link>
          <Link
            href="/cobranza/gamificacion"
            className="rounded-lg bg-blue-light-5 px-3 py-1.5 text-xs font-semibold text-blue-dark hover:bg-blue-light-4"
          >
            Gamificación
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          No tiene permisos de supervisor o error al cargar el dashboard.
        </p>
      )}

      {cargando && (
        <div className="flex h-24 items-center justify-center rounded-xl border border-stroke dark:border-dark-3">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {g && esGerente && (
        <>
          <DashboardMetricStrip metrics={gerenteMetrics} />

          {forecast && <DashboardForecastStrip forecast={forecast} />}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <EquipoSupervisoresChart equipos={g.equipos} />
            </div>
            <div className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark lg:col-span-7">
              <div className="border-b border-stroke px-4 py-2.5 dark:border-dark-3">
                <h3 className="text-sm font-semibold text-dark dark:text-white">
                  Equipos por supervisor
                </h3>
              </div>
              {g.equipos.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-500">
                  Sin equipos registrados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-1 dark:bg-dark-2">
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-5">
                        <th className="px-4 py-2.5 font-medium">Supervisor</th>
                        <th className="px-4 py-2.5 font-medium">Cobradores</th>
                        <th className="px-4 py-2.5 font-medium">Gestiones hoy</th>
                        <th className="px-4 py-2.5 text-right font-medium">
                          Recuperado mes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.equipos.map((eq) => (
                        <tr
                          key={eq.idsupervisor}
                          className="border-t border-stroke dark:border-dark-3"
                        >
                          <td className="px-4 py-2.5 font-medium text-dark dark:text-white">
                            {eq.nombreSupervisor}
                          </td>
                          <td className="px-4 py-2.5">{eq.cobradores}</td>
                          <td className="px-4 py-2.5">{eq.gestionesHoy}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {formatearMoneda(eq.montoRecuperadoMes)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {d && !esGerente && (
        <>
          <DashboardMetricStrip metrics={supervisorMetrics} />

          {forecast && <DashboardForecastStrip forecast={forecast} />}

          {metas && (
            <div className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
              <div className="flex items-center justify-between border-b border-stroke px-4 py-2.5 dark:border-dark-3">
                <h3 className="text-sm font-semibold text-dark dark:text-white">
                  Metas semanales
                </h3>
                <Link
                  href="/configuracion"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Configurar →
                </Link>
              </div>
              <div className="grid grid-cols-1 divide-y divide-stroke sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-dark-3">
                <MetaBar
                  label="Gestiones semana"
                  actual={metas.gestionesSemana}
                  meta={metas.metaGestionesSemana}
                  pct={metas.pctGestiones}
                  cumplida={metas.metaGestionesCumplida}
                  formatear={(n) => String(n)}
                />
                <MetaBar
                  label="Recuperación semanal"
                  actual={metas.recuperacionSemana}
                  meta={metas.metaRecuperacionSemana}
                  pct={metas.pctRecuperacion}
                  cumplida={metas.metaRecuperacionCumplida}
                  formatear={formatearMoneda}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <EquipoRankingChart ranking={d.ranking} />
            </div>
            <div className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark lg:col-span-7">
              <div className="border-b border-stroke px-4 py-2.5 dark:border-dark-3">
                <h3 className="text-sm font-semibold text-dark dark:text-white">
                  Ranking del equipo
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-1 dark:bg-dark-2">
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-5">
                      <th className="px-4 py-2.5 font-medium">Cobrador</th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Gestiones
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Recuperado
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Efectividad
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.ranking.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          Sin datos de ranking.
                        </td>
                      </tr>
                    ) : (
                      d.ranking.map((row) => (
                        <tr
                          key={row.idgestor}
                          className="border-t border-stroke dark:border-dark-3"
                        >
                          <td className="px-4 py-2.5 font-medium text-dark dark:text-white">
                            {row.nombre}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {row.gestiones}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {formatearMoneda(row.montoRecuperado)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                row.efectividadPct >= 70
                                  ? 'bg-green-light-7 text-green-dark'
                                  : row.efectividadPct >= 40
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-light-5 text-red-dark'
                              }`}
                            >
                              {row.efectividadPct}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setMetasCobradorId(row.idgestor);
                                setMetasCobradorNombre(row.nombre);
                              }}
                            >
                              Metas
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      <MetasCobradorModal
        idgestor={metasCobradorId}
        nombreCobrador={metasCobradorNombre}
        onClose={() => {
          setMetasCobradorId(null);
          setMetasCobradorNombre('');
        }}
      />
    </div>
  );
}
