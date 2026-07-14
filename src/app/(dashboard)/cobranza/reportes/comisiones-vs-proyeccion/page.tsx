'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ReporteFiltrosBar } from '@/components/cobranza/reporte-filtros-bar';
import { ReporteTableSection } from '@/components/cobranza/reporte-table-section';
import {
  cellEstadoBadge,
  cellMoneda,
  cellNumero,
  cellTexto,
} from '@/components/cobranza/reporte-table-cells';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { ReporteAsyncContent } from '@/components/cobranza/reporte-async-content';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useReporteExportFeedback } from '@/hooks/use-reporte-export-feedback';
import { GET_REPORTE_COMISIONES_VS_PROYECCION } from '@/lib/graphql/queries/cobranza.queries';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteComisionesVsProyeccion,
} from '@/types/cobranza';
import { exportReporteComisionesVsProyeccionXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';

interface ComparacionRow {
  concepto: string;
  proyectado: number;
  liquidado: number | null;
  diferencial: number | null;
}

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteComisionesVsProyeccion: ReporteComisionesVsProyeccion;
  }>(
    GET_REPORTE_COMISIONES_VS_PROYECCION,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteComisionesVsProyeccion;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    const r = reporte;
    return [
      {
        label: 'Proyectado',
        value: formatearMoneda(r.proyectadoComision),
        sub: `${r.proyectadoPagos} pagos`,
      },
      {
        label: 'Liquidado',
        value: formatearMoneda(r.liquidadoComision),
        sub: r.liquidacionEstado ?? 'Sin liquidación',
      },
      {
        label: 'Diferencial',
        value: formatearMoneda(r.diferencialComision),
        tone: 'warning',
      },
      {
        label: '% liquidado',
        value: `${r.pctLiquidadoVsProyectado}%`,
        tone: 'primary',
      },
    ];
  }, [reporte]);

  const comparacionRows = useMemo<ComparacionRow[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      {
        concepto: 'Comisión',
        proyectado: reporte.proyectadoComision,
        liquidado: reporte.liquidadoComision,
        diferencial: reporte.diferencialComision,
      },
      {
        concepto: 'Recuperado',
        proyectado: reporte.proyectadoRecuperado,
        liquidado: reporte.liquidadoRecuperado,
        diferencial: reporte.diferencialRecuperado,
      },
      {
        concepto: 'Ingreso empresa',
        proyectado: reporte.proyectadoIngresoEmpresa,
        liquidado: null,
        diferencial: null,
      },
    ];
  }, [reporte]);

  const comparacionColumns = useMemo<ColumnDef<ComparacionRow>[]>(
    () => [
      {
        accessorKey: 'concepto',
        header: 'Concepto',
        cell: ({ row }) => cellTexto(row.original.concepto),
      },
      {
        accessorKey: 'proyectado',
        header: 'Proyectado',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.proyectado),
      },
      {
        accessorKey: 'liquidado',
        header: 'Liquidado',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.liquidado),
      },
      {
        accessorKey: 'diferencial',
        header: 'Diferencial',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.diferencial),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comisiones vs proyección"
        description="Contrasta comisión proyectada vs liquidación persistida."
      />

      <ReporteFiltrosBar
        idmandante={idmandante}
        onMandanteChange={(v) => {
          clearFeedback();
          setIdmandante(v);
        }}
        periodo={periodo}
        onPeriodoChange={(v) => {
          clearFeedback();
          setPeriodo(v);
        }}
        periodoId="periodo-comisiones-vs-proyeccion"
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReporteComisionesVsProyeccionXlsx(reporte));
        }}
      />

      {mandanteId === 0 ? (
        <p className="text-sm text-gray-5">Seleccione un mandante.</p>
      ) : (
        <ReporteAsyncContent
          isLoading={isLoading}
          error={error}
          hasData={Boolean(reporte)}
        >
          {reporte ? (
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                  Resumen comparación
                </h2>
                <DashboardMetricStrip metrics={metrics} />
              </div>

              <Card className="rounded-xl" padding="md">
                <CardHeader className="mb-0">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">Liquidación</CardTitle>
                    <p className="mt-1 text-xs text-gray-5">
                      Referencia de la liquidación persistida en el periodo
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-gray-5">ID</span>
                    {reporte.idliquidacion != null
                      ? cellNumero(reporte.idliquidacion)
                      : cellTexto(null)}
                    {cellEstadoBadge(reporte.liquidacionEstado)}
                  </div>
                </CardHeader>
              </Card>

              <ReporteTableSection
                title="Detalle proyectado vs liquidado"
                description="Comparación por concepto usando campos del reporte"
                columns={comparacionColumns}
                data={comparacionRows}
                emptyMessage="Sin datos de comparación."
                itemLabel="conceptos"
                initialPageSize={10}
                resetKey={`${mandanteId}-${periodo}`}
              />
            </div>
          ) : null}
        </ReporteAsyncContent>
      )}
    </div>
  );
}
