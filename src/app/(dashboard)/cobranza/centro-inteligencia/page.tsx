'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { PermissionGate } from '@/components/auth/permission-gate';
import { AlertasOperativasPanel } from '@/components/cobranza/alertas-operativas-panel';
import { ForecastPanel } from '@/components/cobranza/forecast-panel';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { TendenciaRecuperacionChart } from '@/components/cobranza/tendencia-recuperacion-chart';
import { AsyncPanel } from '@/components/ui/async-panel';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import {
  GET_CENTRO_INTELIGENCIA,
  GET_CENTRO_INTELIGENCIA_CHARTS,
  PROCESAR_ACUERDOS_VENCIDOS,
} from '@/lib/graphql/queries/cobranza.queries';
import {
  type CentroInteligenciaResumen,
  type KpiCobranzaCore,
  formatearMoneda,
} from '@/types/cobranza';
import { cn } from '@/lib/utils';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { useAuth } from '@/contexts/auth-context';
import { TourCentroInteligencia } from '@/components/cobranza/tour-centro-inteligencia';

const INSIGHT_DRILL_LINKS: Record<string, string> = {
  promesas: '/cobranza/bandeja?soloPromesaVencida=1',
  acuerdos: '/cobranza/cartera?estado=Con%20acuerdo',
  reclamos: '/cobranza/reclamos',
  'aging-alto': '/cobranza/cartera',
};

function insightBadgeVariant(
  severidad: string,
): 'danger' | 'warning' | 'info' | 'success' | 'default' {
  if (severidad === 'critical') return 'danger';
  if (severidad === 'warning') return 'warning';
  if (severidad === 'info') return 'info';
  if (severidad === 'ok' || severidad === 'success') return 'success';
  return 'default';
}

function insightBadgeLabel(severidad: string): string {
  if (severidad === 'critical') return 'Crítico';
  if (severidad === 'warning') return 'Atención';
  if (severidad === 'info') return 'Info';
  if (severidad === 'ok' || severidad === 'success') return 'Estable';
  return severidad;
}

function moraTone(pct: number): DashboardMetric['tone'] {
  if (pct >= 50) return 'danger';
  if (pct >= 20) return 'warning';
  return 'default';
}

function buildOpsMetrics(
  centro: CentroInteligenciaResumen,
  kpis: KpiCobranzaCore | undefined,
): DashboardMetric[] {
  const saldoMoraPct = kpis?.carteraEnMoraPct ?? null;
  const prestamosMoraPct = centro.prestamosEnMoraPct;

  return [
    {
      label: 'Saldo en mora',
      value: saldoMoraPct != null ? `${saldoMoraPct}%` : '—',
      sub: kpis
        ? `${formatearMoneda(kpis.carteraEnMora)} de ${formatearMoneda(kpis.carteraTotal)}`
        : 'Por saldo de cartera',
      href: '/cobranza/cartera',
      tone: saldoMoraPct != null ? moraTone(saldoMoraPct) : 'default',
    },
    {
      label: 'Préstamos en mora',
      value: `${prestamosMoraPct}%`,
      sub: 'Por conteo · Ver cartera',
      href: '/cobranza/cartera',
      tone: moraTone(prestamosMoraPct),
    },
    {
      label: 'Tasa de contacto',
      value: kpis ? `${kpis.tasaContactoPct}%` : '—',
      sub: kpis ? `${kpis.gestionesMes} gestiones en el mes` : undefined,
      href: '/cobranza/gestiones',
    },
    {
      label: 'Promesas abiertas',
      value: kpis ? String(kpis.promesasAbiertas) : '—',
      href: '/cobranza/bandeja',
    },
    {
      label: 'Acuerdos vigentes',
      value: kpis ? String(kpis.acuerdosVigentes) : '—',
      href: '/cobranza/cartera?estado=Con%20acuerdo',
    },
    {
      label: 'Cartera total',
      value: kpis ? formatearMoneda(kpis.carteraTotal) : '—',
      href: '/cobranza/cartera',
    },
  ];
}

export default function CentroInteligenciaPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const { usuario } = useAuth();

  const mandanteId = idmandante === '' ? undefined : idmandante;

  const { data, isLoading, error, refetch } = useGraphQLQuery<{
    centroInteligencia: CentroInteligenciaResumen;
  }>(GET_CENTRO_INTELIGENCIA, { idmandante: mandanteId });

  const chartsEnabled = !isLoading && Boolean(data?.centroInteligencia);

  const { data: chartsData } = useGraphQLQuery<{
    kpisCobranzaCore: KpiCobranzaCore;
    tendenciaRecuperacion: Array<{ periodo: string; monto: number }>;
    rollRateCartera: {
      periodoDesde: string;
      periodoHasta: string;
      totalTransiciones: number;
      buckets: Array<{
        estadoOrigen: string;
        estadoDestino: string;
        cantidad: number;
        pct: number;
      }>;
    };
    forecastRecuperacion: {
      recuperadoMesActual: number;
      forecastFinMes: number;
      runRateDiario: number;
      diasRestantesMes: number;
      metaMes: number | null;
      pctMeta: number | null;
    };
  }>(
    GET_CENTRO_INTELIGENCIA_CHARTS,
    {
      idmandante: mandanteId,
      meses: 6,
      mesesAtras: 3,
    },
    { enabled: chartsEnabled },
  );

  const procesarMutation = useGraphQLMutation(PROCESAR_ACUERDOS_VENCIDOS, {
    onSuccess: () => {
      void refetch();
    },
  });

  const centro = data?.centroInteligencia;
  const kpis = chartsData?.kpisCobranzaCore;
  const tendencia = chartsData?.tendenciaRecuperacion ?? [];
  const rollRate = chartsData?.rollRateCartera;
  const forecast = chartsData?.forecastRecuperacion;
  const recuperacionUp =
    centro != null && centro.variacionRecuperacionPct >= 0;

  return (
    <div className="space-y-8">
      <TourCentroInteligencia idusuario={usuario?.idusuario ?? null} />
      <PageHeader
        title="Centro de Inteligencia"
        description="Decisiones basadas en datos: salud de cartera, alertas e insights operativos."
        actions={
          <PermissionGate permiso={PERMISO.ACUERDO_WRITE}>
            <Button
              variant="outline"
              disabled={procesarMutation.isPending}
              onClick={() => procesarMutation.mutate({})}
            >
              Evaluar acuerdos vencidos
            </Button>
          </PermissionGate>
        }
      />

      <div className="rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
        <MandanteSelect
          value={idmandante}
          onChange={setIdmandante}
          allowAll
          selectClassName="w-full max-w-md rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        />
      </div>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!centro}
        loadingMessage="Analizando cartera..."
        emptyMessage="Sin datos de inteligencia para el filtro seleccionado."
        errorMessage="No se pudo cargar el centro de inteligencia."
      >
        {centro ? (
        <>
          <div className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
            <div className="border-b border-stroke px-4 py-2.5 dark:border-dark-3">
              <p className="text-xs text-gray-5">
                Estado general de la cartera · actualiza al filtrar mandante
              </p>
            </div>
            <div className="grid grid-cols-1 divide-y divide-stroke sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-dark-3">
              <Link
                href="/cobranza/reportes"
                className="min-w-0 bg-primary/[0.06] px-5 py-5 transition-colors hover:bg-primary/[0.1] dark:bg-primary/10 dark:hover:bg-primary/15"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-5">
                  Salud de cartera
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums text-primary">
                  {centro.saludCartera}
                </p>
                <p className="mt-1 text-xs text-gray-5">
                  Índice 0-100 · Ver reportes
                </p>
              </Link>
              <Link
                href="/cobranza/reportes"
                className="min-w-0 px-5 py-5 transition-colors hover:bg-primary/[0.06] dark:hover:bg-primary/10"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-5">
                  Recuperación del mes
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-dark dark:text-white">
                  {formatearMoneda(centro.recuperacionMes)}
                </p>
                <p
                  className={cn(
                    'mt-1 text-xs font-medium',
                    recuperacionUp ? 'text-green-600' : 'text-red-600',
                  )}
                >
                  {recuperacionUp ? '+' : ''}
                  {centro.variacionRecuperacionPct}% vs mes anterior
                </p>
              </Link>
            </div>
          </div>

          <div data-tour-id="ci-metrics">
            <h2 className="mb-3 text-lg font-semibold text-dark dark:text-white">
              Indicadores operativos
            </h2>
            <DashboardMetricStrip metrics={buildOpsMetrics(centro, kpis)} />
          </div>

          <div data-tour-id="ci-alertas">
            <AlertasOperativasPanel
              promesasVencidas={centro.promesasVencidas}
              acuerdosEnRiesgo={centro.acuerdosEnRiesgo}
              reclamosFueraSla={centro.reclamosFueraSla}
            />
          </div>

          {forecast && (
            <div data-tour-id="ci-forecast">
              <ForecastPanel forecast={forecast} />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div data-tour-id="ci-insights">
              <h2 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                Insights
              </h2>
              <div className="space-y-3">
                {centro.insights.map((insight) => {
                  const drillHref = INSIGHT_DRILL_LINKS[insight.id];
                  const inner = (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <Badge
                            variant={insightBadgeVariant(insight.severidad)}
                            size="sm"
                          >
                            {insightBadgeLabel(insight.severidad)}
                          </Badge>
                          <p className="font-medium text-dark dark:text-white">
                            {insight.titulo}
                          </p>
                        </div>
                        {insight.metrica && (
                          <span className="shrink-0 text-xs font-semibold text-primary">
                            {insight.metrica}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {insight.descripcion}
                      </p>
                      {insight.accionSugerida && (
                        <p className="mt-2 text-xs font-medium text-primary">
                          → {insight.accionSugerida}
                        </p>
                      )}
                    </>
                  );

                  const cardClass =
                    'block rounded-xl border border-stroke bg-white p-4 shadow-sm transition hover:border-primary dark:border-dark-3 dark:bg-gray-dark';

                  return drillHref ? (
                    <Link
                      key={insight.id}
                      href={drillHref}
                      className={cardClass}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div key={insight.id} className={cardClass}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>

            <div data-tour-id="ci-tendencia">
              <TendenciaRecuperacionChart
                tendencia={tendencia}
                titulo="Tendencia de recuperación (6 meses)"
              />
            </div>
          </div>

          {rollRate && rollRate.buckets.length > 0 && (
            <Card className="rounded-xl" padding="md">
              <CardHeader className="mb-2">
                <div>
                  <CardTitle>
                    Movimiento de estados de cartera
                  </CardTitle>
                  <p className="mt-1 text-xs text-gray-5">
                    {rollRate.periodoDesde} — {rollRate.periodoHasta} ·{' '}
                    {rollRate.totalTransiciones} transiciones en el periodo
                  </p>
                </div>
              </CardHeader>
              <div className="overflow-x-auto rounded-lg border border-stroke dark:border-dark-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left dark:border-dark-3 dark:bg-dark-2">
                      <th className="p-3 font-medium">Origen</th>
                      <th className="font-medium">Destino</th>
                      <th className="font-medium">Cantidad</th>
                      <th className="font-medium">% del origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rollRate.buckets.slice(0, 12).map((b) => (
                      <tr
                        key={`${b.estadoOrigen}-${b.estadoDestino}`}
                        className="border-b dark:border-dark-3"
                      >
                        <td className="p-3">{b.estadoOrigen}</td>
                        <td>{b.estadoDestino}</td>
                        <td className="tabular-nums">{b.cantidad}</td>
                        <td className="tabular-nums">{b.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
        ) : null}
      </AsyncPanel>
    </div>
  );
}
