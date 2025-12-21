"use client";

import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import {
  GET_DASHBOARD_KPIS,
  GET_PRESTAMOS_ULTIMOS_30_DIAS,
  GET_PROMESAS_VENCIDAS_HOY,
  GET_RANKING_GESTORES_DASHBOARD,
} from "@/lib/graphql/queries/dashboard.queries";
import { KPICard } from "./kpi-card";
import { CarteraChart } from "./cartera-chart";
import { PrestamosChart } from "./prestamos-chart";
import { PromesasTable } from "./promesas-table";
import { RankingGestoresTable } from "./ranking-gestores-table";

interface DashboardKPIs {
  dashboardKPIs: {
    totalPrestado: number;
    totalRecuperado: number;
    carteraActiva: number;
    carteraVencida: number;
    moraPromedio: number;
    promesasVencidasHoy: number;
    prestamosUltimos30Dias: number;
  };
}

interface PrestamosData {
  prestamosUltimos30Dias: {
    total: number;
    montoTotal: number;
    items: Array<{
      fecha: string;
      cantidad: number;
      montoTotal: number;
    }>;
  };
}

interface PromesasData {
  promesasVencidasHoy: {
    total: number;
    montoTotal: number;
    items: Array<{
      idpromesa: number;
      idprestamo: number;
      codigoPrestamo: string;
      cliente: string;
      fechaPromesa: string;
      montoCompromiso: number;
      diasVencidos: number;
      gestor: string | null;
    }>;
  };
}

interface RankingData {
  rankingGestores: {
    periodo: string;
    items: Array<{
      idusuario: number;
      nombre: string;
      email: string;
      cantidadPrestamos: number;
      montoTotal: number;
      montoRecuperado: number;
      porcentajeRecuperacion: number;
      moraPromedio: number;
      posicion: number;
    }>;
  };
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function DashboardAvanzado({ idusuario }: { idusuario?: number }) {
  // Configurar polling cada 30 segundos para actualización en tiempo real
  const queryOptions = {
    refetchInterval: 30000, // 30 segundos
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  };

  // Cargar datos con TanStack Query
  const { data: kpisData, isLoading: kpisLoading } = useGraphQLQuery<DashboardKPIs>(
    GET_DASHBOARD_KPIS,
    { idusuario },
    queryOptions
  );

  const { data: prestamosData, isLoading: prestamosLoading } = useGraphQLQuery<PrestamosData>(
    GET_PRESTAMOS_ULTIMOS_30_DIAS,
    { idusuario },
    queryOptions
  );

  const { data: promesasData, isLoading: promesasLoading } = useGraphQLQuery<PromesasData>(
    GET_PROMESAS_VENCIDAS_HOY,
    { idusuario },
    queryOptions
  );

  const { data: rankingData, isLoading: rankingLoading } = useGraphQLQuery<RankingData>(
    GET_RANKING_GESTORES_DASHBOARD,
    { filters: {}, idusuario },
    queryOptions
  );

  const kpis = kpisData?.dashboardKPIs;
  const prestamos = prestamosData?.prestamosUltimos30Dias;
  const promesas = promesasData?.promesasVencidasHoy;
  const ranking = rankingData?.rankingGestores;

  const isLoading = kpisLoading || prestamosLoading || promesasLoading || rankingLoading;

  if (isLoading && !kpis) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-gray-600 dark:text-gray-300">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Dashboard Avanzado</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Visión general del negocio en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
          <span>Actualización en tiempo real</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Prestado"
          value={formatCurrency(kpis?.totalPrestado || 0)}
          icon="💰"
          trend={null}
          loading={kpisLoading}
        />
        <KPICard
          title="Total Recuperado"
          value={formatCurrency(kpis?.totalRecuperado || 0)}
          icon="💵"
          trend={null}
          loading={kpisLoading}
        />
        <KPICard
          title="Mora Promedio"
          value={`${kpis?.moraPromedio.toFixed(1) || 0} días`}
          icon="⏱️"
          trend={null}
          loading={kpisLoading}
        />
        <KPICard
          title="Préstamos (30 días)"
          value={kpis?.prestamosUltimos30Dias.toString() || "0"}
          icon="📊"
          trend={null}
          loading={kpisLoading}
        />
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CarteraChart
          carteraActiva={kpis?.carteraActiva || 0}
          carteraVencida={kpis?.carteraVencida || 0}
          loading={kpisLoading}
        />
        <PrestamosChart
          data={prestamos?.items || []}
          loading={prestamosLoading}
        />
      </div>

      {/* Tablas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PromesasTable
          promesas={promesas?.items || []}
          total={promesas?.total || 0}
          montoTotal={promesas?.montoTotal || 0}
          loading={promesasLoading}
        />
        <RankingGestoresTable
          ranking={ranking?.items || []}
          periodo={ranking?.periodo || ""}
          loading={rankingLoading}
        />
      </div>
    </div>
  );
}



