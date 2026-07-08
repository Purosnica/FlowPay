'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { AlertasOperativasPanel } from '@/components/cobranza/alertas-operativas-panel';
import { ForecastPanel } from '@/components/cobranza/forecast-panel';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { TendenciaRecuperacionChart } from '@/components/cobranza/tendencia-recuperacion-chart';
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


function severidadClass(severidad: string): string {
  if (severidad === 'critical') {
    return 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30';
  }
  if (severidad === 'warning') {
    return 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30';
  }
  return 'border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark';
}

const INSIGHT_DRILL_LINKS: Record<string, string> = {
  promesas: '/cobranza/bandeja?soloPromesaVencida=1',
  acuerdos: '/cobranza/cartera?estado=Con%20acuerdo',
  reclamos: '/cobranza/reclamos',
  'aging-alto': '/cobranza/cartera',
};

function DrillCard({
  href,
  children,
  className,
}: {
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  if (!href) {
    return <div className={className}>{children}</div>;
  }
  return (
    <Link href={href} className={`block transition hover:border-primary ${className ?? ''}`}>
      {children}
    </Link>
  );
}

export default function CentroInteligenciaPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');

  const mandanteId = idmandante === '' ? undefined : idmandante;

  const { data, isLoading, refetch } = useGraphQLQuery<{
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Centro de Inteligencia"
        description="Decisiones basadas en datos: salud de cartera, alertas e insights operativos."
        actions={
          <Button
            variant="outline"
            disabled={procesarMutation.isPending}
            onClick={() => procesarMutation.mutate({})}
          >
            Evaluar acuerdos vencidos
          </Button>
        }
      />

      <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <MandanteSelect
          value={idmandante}
          onChange={setIdmandante}
          allowAll
          selectClassName="w-full max-w-md rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        />
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500">Analizando cartera...</p>
      )}

      {centro && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DrillCard
              href="/cobranza/reportes"
              className="rounded-lg border p-4 dark:border-dark-3"
            >
              <p className="text-xs text-gray-500">Salud de cartera</p>
              <p className="mt-1 text-3xl font-bold text-primary">
                {centro.saludCartera}
              </p>
              <p className="text-xs text-gray-400">Índice 0-100 · Ver reportes</p>
            </DrillCard>
            <DrillCard
              href="/cobranza/reportes"
              className="rounded-lg border p-4 dark:border-dark-3"
            >
              <p className="text-xs text-gray-500">Recuperación del mes</p>
              <p className="mt-1 text-2xl font-bold">
                {formatearMoneda(centro.recuperacionMes)}
              </p>
              <p
                className={`text-xs ${
                  centro.variacionRecuperacionPct >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {centro.variacionRecuperacionPct >= 0 ? '+' : ''}
                {centro.variacionRecuperacionPct}% vs mes anterior
              </p>
            </DrillCard>
            <DrillCard
              href="/cobranza/cartera"
              className="rounded-lg border p-4 dark:border-dark-3"
            >
              <p className="text-xs text-gray-500">Saldo en mora</p>
              <p className="mt-1 text-2xl font-bold">
                {kpis ? `${kpis.carteraEnMoraPct}%` : '—'}
              </p>
              <p className="text-xs text-gray-400">
                {kpis
                  ? `${formatearMoneda(kpis.carteraEnMora)} de ${formatearMoneda(kpis.carteraTotal)}`
                  : 'Por saldo de cartera'}
              </p>
            </DrillCard>
            <DrillCard
              href="/cobranza/cartera"
              className="rounded-lg border p-4 dark:border-dark-3"
            >
              <p className="text-xs text-gray-500">Préstamos en mora</p>
              <p className="mt-1 text-2xl font-bold">
                {centro.prestamosEnMoraPct}%
              </p>
              <p className="text-xs text-gray-400">Por conteo · Ver cartera</p>
            </DrillCard>
          </div>

          {kpis && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <DrillCard
                href="/cobranza/gestiones"
                className="rounded-lg border p-4 dark:border-dark-3"
              >
                <p className="text-xs text-gray-500">Tasa de contacto</p>
                <p className="mt-1 text-2xl font-bold">{kpis.tasaContactoPct}%</p>
                <p className="text-xs text-gray-400">
                  {kpis.gestionesMes} gestiones en el mes
                </p>
              </DrillCard>
              <DrillCard
                href="/cobranza/bandeja"
                className="rounded-lg border p-4 dark:border-dark-3"
              >
                <p className="text-xs text-gray-500">Promesas abiertas</p>
                <p className="mt-1 text-2xl font-bold">{kpis.promesasAbiertas}</p>
              </DrillCard>
              <DrillCard
                href="/cobranza/cartera?estado=Con%20acuerdo"
                className="rounded-lg border p-4 dark:border-dark-3"
              >
                <p className="text-xs text-gray-500">Acuerdos vigentes</p>
                <p className="mt-1 text-2xl font-bold">{kpis.acuerdosVigentes}</p>
              </DrillCard>
              <DrillCard
                href="/cobranza/cartera"
                className="rounded-lg border p-4 dark:border-dark-3"
              >
                <p className="text-xs text-gray-500">Cartera total</p>
                <p className="mt-1 text-xl font-bold">
                  {formatearMoneda(kpis.carteraTotal)}
                </p>
              </DrillCard>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-lg font-semibold">Alertas operativas</h2>
            <AlertasOperativasPanel
              promesasVencidas={centro.promesasVencidas}
              acuerdosEnRiesgo={centro.acuerdosEnRiesgo}
              reclamosFueraSla={centro.reclamosFueraSla}
            />
          </div>

          {forecast && <ForecastPanel forecast={forecast} />}

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-lg font-semibold">Insights</h2>
              <div className="space-y-3">
                {centro.insights.map((insight) => {
                  const drillHref = INSIGHT_DRILL_LINKS[insight.id];
                  const inner = (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{insight.titulo}</p>
                        {insight.metrica && (
                          <span className="shrink-0 text-xs font-semibold text-primary">
                            {insight.metrica}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {insight.descripcion}
                      </p>
                      {insight.accionSugerida && (
                        <p className="mt-2 text-xs font-medium text-primary">
                          → {insight.accionSugerida}
                        </p>
                      )}
                    </>
                  );
                  return drillHref ? (
                    <Link
                      key={insight.id}
                      href={drillHref}
                      className={`block rounded-lg border p-4 transition hover:border-primary ${severidadClass(insight.severidad)}`}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div
                      key={insight.id}
                      className={`rounded-lg border p-4 ${severidadClass(insight.severidad)}`}
                    >
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>

            <TendenciaRecuperacionChart
              tendencia={tendencia}
              titulo="Tendencia de recuperación (6 meses)"
            />
          </div>

          {rollRate && rollRate.buckets.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">
                Roll-rate de estados ({rollRate.periodoDesde} —{' '}
                {rollRate.periodoHasta})
              </h2>
              <p className="mb-2 text-xs text-gray-500">
                {rollRate.totalTransiciones} transiciones en el periodo
              </p>
              <div className="overflow-x-auto rounded-lg border dark:border-dark-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left dark:border-dark-3 dark:bg-dark-2">
                      <th className="p-3">Origen</th>
                      <th>Destino</th>
                      <th>Cantidad</th>
                      <th>% del origen</th>
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
                        <td>{b.cantidad}</td>
                        <td>{b.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
