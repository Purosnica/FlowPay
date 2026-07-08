'use client';

import Link from 'next/link';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import {
  GET_DASHBOARD_GERENTE,
  GET_DASHBOARD_SUPERVISOR,
} from '@/lib/graphql/queries/cobranza.queries';
import { useEsGerente, useEsSupervisor } from '@/hooks/use-rol';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import {
  type DashboardSupervisorResumen,
  formatearMoneda,
} from '@/types/cobranza';

/**
 * Solo métricas de equipo (no duplica mora/recuperación del resumen global).
 */
export function DashboardRolPanel() {
  const esGerente = useEsGerente();
  const esSupervisor = useEsSupervisor();

  const { data: supData, isLoading: loadingSup } = useGraphQLQuery<{
    dashboardSupervisor: DashboardSupervisorResumen;
  }>(GET_DASHBOARD_SUPERVISOR, undefined, {
    enabled: esSupervisor || esGerente,
  });

  const { data: gerData } = useGraphQLQuery<{
    dashboardGerente: {
      totalSupervisores: number;
      totalCobradores: number;
      gestionesHoy: number;
      montoRecuperadoMes: number;
      reclamosFueraSla: number;
      carteraEnMoraPct: number;
    };
  }>(GET_DASHBOARD_GERENTE, undefined, { enabled: esGerente });

  const supervisor = supData?.dashboardSupervisor;
  const gerente = gerData?.dashboardGerente;

  if (!esSupervisor && !esGerente) {
    return null;
  }

  if (loadingSup && !supervisor) {
    return (
      <div className="flex h-16 items-center justify-center rounded-xl border border-stroke dark:border-dark-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const metrics: DashboardMetric[] = [];

  if (esGerente && gerente) {
    metrics.push(
      {
        label: 'Cobradores',
        value: String(gerente.totalCobradores),
        href: '/cobranza/equipo',
        tone: 'primary',
      },
      {
        label: 'Supervisores',
        value: String(gerente.totalSupervisores),
        href: '/cobranza/equipo',
      },
      {
        label: 'Reclamos fuera SLA',
        value: String(gerente.reclamosFueraSla),
        href: '/cobranza/reclamos',
        tone: gerente.reclamosFueraSla > 0 ? 'danger' : 'default',
      },
    );
  }

  if (supervisor) {
    metrics.push(
      {
        label: 'Gestiones hoy (equipo)',
        value: String(supervisor.gestionesHoy),
        sub: `Ayer: ${supervisor.gestionesAyer}`,
        href: '/cobranza/gestiones',
      },
      {
        label: 'Recuperado equipo',
        value: formatearMoneda(supervisor.montoRecuperadoMes),
        tone: 'success',
      },
      {
        label: 'Promesas venc. equipo',
        value: String(supervisor.promesasVencidasEquipo),
        href: '/cobranza/bandeja?soloPromesaVencida=1',
        tone: supervisor.promesasVencidasEquipo > 0 ? 'warning' : 'default',
      },
      {
        label: 'Sin gestión 7+ días',
        value: String(supervisor.casosSinGestion7d),
        href: '/cobranza/bandeja?soloSinGestion=1',
        tone: supervisor.casosSinGestion7d > 0 ? 'danger' : 'default',
      },
    );

    if (supervisor.tasaContactoEquipoPct != null) {
      metrics.push({
        label: 'Tasa contacto equipo',
        value: `${supervisor.tasaContactoEquipoPct}%`,
        href: '/cobranza/equipo',
        tone: 'primary',
      });
    }
  }

  if (metrics.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-dark dark:text-white">
          {esGerente ? 'Equipo gerencial' : 'Equipo de supervisión'}
        </h2>
        <Link
          href="/cobranza/equipo"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Ver equipo →
        </Link>
      </div>
      <DashboardMetricStrip metrics={metrics} />
    </section>
  );
}
