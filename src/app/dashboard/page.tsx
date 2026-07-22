'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useEsCobrador, useEsSupervisor, useEsGerente } from '@/hooks/use-rol';
import {
  GET_CENTRO_INTELIGENCIA_CHARTS,
  GET_KPIS_COBRANZA_CORE,
  GET_PROMESAS_VENCIDAS,
  GET_RESUMEN_DASHBOARD,
  GET_RESUMEN_MI_DIA,
  GET_TENDENCIA_RECUPERACION,
} from '@/lib/graphql/queries/cobranza.queries';
import { PromesasVencidasPanel } from '@/components/cobranza/promesas-vencidas-panel';
import { DashboardRolPanel } from '@/components/dashboard/dashboard-rol-panel';
import { DashboardComposicionChart } from '@/components/dashboard/dashboard-composicion-chart';
import { DashboardTendenciaChart } from '@/components/dashboard/dashboard-tendencia-chart';
import { DashboardActividadChart } from '@/components/dashboard/dashboard-actividad-chart';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { DashboardForecastStrip } from '@/components/dashboard/dashboard-forecast-strip';
import {
  DashboardAccesosRapidos,
  type AccesoRapidoItem,
} from '@/components/dashboard/dashboard-accesos-rapidos';
import { NextActionsPanel } from '@/components/dashboard/next-actions-panel';
import { OnboardingGuide } from '@/components/onboarding/onboarding-guide';
import { SearchParamsBoundary } from '@/components/ui/search-params-boundary';
import { PERMISO, PERMISOS_REPORTE_CUALQUIERA } from '@/lib/permissions/permiso-codes';
import {
  type DashboardResumenCobranza,
  type KpiCobranzaCore,
  type MiDiaResumen,
  type PromesaVencida,
  formatearMoneda,
} from '@/types/cobranza';

function buildHeroMetrics(
  r: DashboardResumenCobranza | undefined,
  kpis: KpiCobranzaCore | undefined,
): DashboardMetric[] {
  const metrics: DashboardMetric[] = [];

  if (kpis) {
    metrics.push({
      label: 'Cartera en mora',
      value: `${kpis.carteraEnMoraPct}%`,
      sub: formatearMoneda(kpis.carteraEnMora),
      href: '/cobranza/reportes',
      tone: kpis.carteraEnMoraPct > 30 ? 'warning' : 'default',
    });
    metrics.push({
      label: 'Cartera total',
      value: formatearMoneda(kpis.carteraTotal),
      tone: 'primary',
    });
    metrics.push({
      label: 'Recuperación mes',
      value: formatearMoneda(kpis.recuperacionMes),
      tone: 'success',
    });
    metrics.push({
      label: 'Tasa contacto',
      value: `${kpis.tasaContactoPct}%`,
      sub: `${kpis.gestionesMes} gestiones`,
    });
  } else if (r) {
    metrics.push({
      label: 'Cartera total',
      value: formatearMoneda(r.saldoCartera),
      tone: 'primary',
    });
  }

  if (r) {
    metrics.push({
      label: 'Préstamos',
      value: String(r.totalPrestamos),
      href: '/cobranza/cartera',
    });
    metrics.push({
      label: 'En mora',
      value: String(r.prestamosEnMora),
      href: '/cobranza/cartera',
      tone: r.prestamosEnMora > 0 ? 'warning' : 'default',
    });
    metrics.push({
      label: 'Pagos mes',
      value: String(r.pagosMes),
      sub: `${r.pagosConciliadosMes} conciliados`,
      href: '/cobranza/conciliaciones',
    });
    metrics.push({
      label: 'Alertas',
      value: String(r.reclamosAbiertos + r.promesasVencidas),
      sub: `${r.promesasVencidas} promesas · ${r.reclamosAbiertos} reclamos`,
      href: '/cobranza/bandeja',
      tone:
        r.reclamosAbiertos + r.promesasVencidas > 0 ? 'danger' : 'default',
    });
  }

  if (kpis && !r) {
    metrics.push({
      label: 'Acuerdos vigentes',
      value: String(kpis.acuerdosVigentes),
      href: '/cobranza/cartera',
    });
  }

  return metrics;
}

function DashboardPageContent() {
  const searchParams = useSearchParams();
  const sinPermiso = searchParams.get('error') === 'sin_permiso';
  const { permisos, usuario } = useAuth();
  const esCobrador = useEsCobrador();
  const esSupervisor = useEsSupervisor();
  const esGerente = useEsGerente();

  const puedeInteligencia = permisos.includes(PERMISO.INTELIGENCIA_READ);
  const puedeEquipo = permisos.includes(PERMISO.EQUIPO_READ);
  const puedeCartera = permisos.includes(PERMISO.CARTERA_READ);
  const puedeConfig = permisos.includes(PERMISO.CONFIG_SYSTEM);
  const puedeImportar = permisos.includes(PERMISO.CARTERA_WRITE);
  const puedeReportes = PERMISOS_REPORTE_CUALQUIERA.some((p) =>
    permisos.includes(p),
  );
  const puedeKpisAnaliticos =
    puedeReportes || permisos.includes(PERMISO.INTELIGENCIA_READ);

  const mostrarKpisMandante = puedeCartera && !esCobrador;

  const { data, isLoading } = useGraphQLQuery<{
    resumenDashboardCobranza: DashboardResumenCobranza;
  }>(GET_RESUMEN_DASHBOARD, undefined, { enabled: mostrarKpisMandante });

  const { data: kpisData, isLoading: kpisLoading } = useGraphQLQuery<{
    kpisCobranzaCore: KpiCobranzaCore;
  }>(GET_KPIS_COBRANZA_CORE, undefined, {
    enabled: mostrarKpisMandante && puedeKpisAnaliticos && !puedeInteligencia,
  });

  const { data: chartsData, isLoading: chartsLoading } = useGraphQLQuery<{
    kpisCobranzaCore: KpiCobranzaCore;
    tendenciaRecuperacion: Array<{ periodo: string; monto: number }>;
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
    { meses: 6, mesesAtras: 3 },
    { enabled: mostrarKpisMandante && puedeInteligencia },
  );

  const { data: tendenciaData } = useGraphQLQuery<{
    tendenciaRecuperacion: Array<{ periodo: string; monto: number }>;
  }>(
    GET_TENDENCIA_RECUPERACION,
    { meses: 6 },
    {
      enabled:
        mostrarKpisMandante && puedeKpisAnaliticos && !puedeInteligencia,
    },
  );

  const { data: miDiaData, isLoading: miDiaLoading } = useGraphQLQuery<{
    resumenMiDia: MiDiaResumen;
  }>(GET_RESUMEN_MI_DIA, undefined, { enabled: esCobrador && puedeCartera });

  const { data: promesasData, isLoading: promesasLoading } = useGraphQLQuery<{
    promesasVencidas: PromesaVencida[];
  }>(GET_PROMESAS_VENCIDAS, { soloMisAsignados: true, limit: 8 });

  const r = data?.resumenDashboardCobranza;
  const kpis =
    chartsData?.kpisCobranzaCore ?? kpisData?.kpisCobranzaCore ?? undefined;
  const tendencia =
    chartsData?.tendenciaRecuperacion ??
    tendenciaData?.tendenciaRecuperacion ??
    [];
  const forecast = chartsData?.forecastRecuperacion;
  const miDia = miDiaData?.resumenMiDia;
  const promesas = promesasData?.promesasVencidas ?? [];
  const heroMetrics = buildHeroMetrics(r, kpis);

  const accesos: AccesoRapidoItem[] = [];
  if (puedeCartera) {
    accesos.push({ href: '/cobranza/mi-dia', label: 'Mi día' });
    accesos.push({ href: '/cobranza/bandeja', label: 'Bandeja' });
    if (!esCobrador) {
      accesos.push({ href: '/cobranza/cartera', label: 'Cartera' });
      accesos.push({ href: '/clientes', label: 'Clientes' });
    }
  }
  if (puedeInteligencia) {
    accesos.push({
      href: '/cobranza/centro-inteligencia',
      label: 'Inteligencia',
    });
  }
  if (puedeEquipo) {
    accesos.push({ href: '/cobranza/equipo', label: 'Equipo' });
  }
  if (puedeImportar) {
    accesos.push({ href: '/cobranza/importar', label: 'Importar' });
  }
  if (puedeReportes) {
    accesos.push({ href: '/cobranza/reportes', label: 'Reportes' });
  }
  if (puedeConfig) {
    accesos.push({ href: '/configuracion', label: 'Config' });
  }

  const cargandoDatos =
    (isLoading && mostrarKpisMandante) ||
    (kpisLoading &&
      mostrarKpisMandante &&
      puedeKpisAnaliticos &&
      !puedeInteligencia) ||
    (chartsLoading && mostrarKpisMandante && puedeInteligencia);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            Panel de cobranza
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {esCobrador
              ? 'Prioridades y resultados del día'
              : 'Salud de cartera, actividad y equipo'}
          </p>
        </div>
        {puedeCartera && !esCobrador && (
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
              href="/cobranza/bandeja?soloSinGestion=1"
              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300"
            >
              Sin gestión
            </Link>
            <Link
              href="/cobranza/bandeja?soloAgendaHoy=1"
              className="rounded-lg bg-blue-light-5 px-3 py-1.5 text-xs font-semibold text-blue-dark hover:bg-blue-light-4"
            >
              Agenda hoy
            </Link>
          </div>
        )}
      </div>

      {sinPermiso && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          No tiene permisos para acceder a esa sección.
        </div>
      )}

      <OnboardingGuide
        idusuario={usuario?.idusuario ?? null}
        habilitado={Boolean(usuario)}
      />

      {cargandoDatos && (
        <div className="flex h-24 items-center justify-center rounded-xl border border-stroke dark:border-dark-3">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {mostrarKpisMandante && heroMetrics.length > 0 && (
        <DashboardMetricStrip metrics={heroMetrics} />
      )}

      {(esSupervisor || esGerente) && <DashboardRolPanel />}

      {esCobrador && puedeCartera && miDia && (
        <DashboardMetricStrip
          metrics={[
            {
              label: 'Gestiones hoy',
              value: String(miDia.gestionesHoy),
            },
            {
              label: 'Pagos hoy',
              value: String(miDia.pagosHoy),
              tone: 'success',
            },
            {
              label: 'Recuperado hoy',
              value: formatearMoneda(miDia.montoRecuperadoHoy),
              tone: 'primary',
            },
          ]}
        />
      )}

      {esCobrador && puedeCartera && (
        <NextActionsPanel miDia={miDia} isLoading={miDiaLoading} />
      )}

      {mostrarKpisMandante && (kpis || r || puedeKpisAnaliticos) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {kpis && (
            <div className="lg:col-span-4">
              <DashboardComposicionChart
                carteraTotal={kpis.carteraTotal}
                carteraEnMora={kpis.carteraEnMora}
                carteraEnMoraPct={kpis.carteraEnMoraPct}
              />
            </div>
          )}
          {puedeKpisAnaliticos && (
            <div className={kpis ? 'lg:col-span-5' : 'lg:col-span-7'}>
              <DashboardTendenciaChart tendencia={tendencia} />
            </div>
          )}
          {r && (
            <div
              className={
                kpis && puedeKpisAnaliticos
                  ? 'lg:col-span-3'
                  : 'lg:col-span-5'
              }
            >
              <DashboardActividadChart
                gestionesMes={r.gestionesMes}
                pagosMes={r.pagosMes}
                pagosConciliadosMes={r.pagosConciliadosMes}
                reclamosAbiertos={r.reclamosAbiertos}
                promesasVencidas={r.promesasVencidas}
              />
            </div>
          )}
        </div>
      )}

      {forecast && puedeInteligencia && (
        <DashboardForecastStrip forecast={forecast} />
      )}

      {(promesas.length > 0 || accesos.length > 0) && (
        <div
          className={`grid grid-cols-1 gap-4 ${
            promesas.length > 0 ? 'xl:grid-cols-5' : ''
          }`}
        >
          {promesas.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30 xl:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Promesas vencidas
                </h2>
                <Link
                  href="/cobranza/bandeja"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ver bandeja →
                </Link>
              </div>
              <PromesasVencidasPanel
                promesas={promesas}
                isLoading={promesasLoading}
                compact
              />
            </div>
          )}
          {accesos.length > 0 && (
            <div className={promesas.length > 0 ? 'xl:col-span-2' : ''}>
              <DashboardAccesosRapidos items={accesos} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <SearchParamsBoundary>
      <DashboardPageContent />
    </SearchParamsBoundary>
  );
}
