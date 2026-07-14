'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ClientPaginatedDataTable } from '@/components/cobranza/client-paginated-data-table';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { AsyncPanel } from '@/components/ui/async-panel';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_REPORTE_GANANCIAS } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteGananciasXlsx } from '@/lib/cobranza/export-reportes-control-xlsx';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteGanancias,
  type ReporteGananciasGestorItem,
  type ReporteGananciasTramoItem,
} from '@/types/cobranza';

export default function ReporteGananciasPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [exportOk, setExportOk] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteGanancias: ReporteGanancias;
  }>(
    GET_REPORTE_GANANCIAS,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteGanancias;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      {
        label: 'Recuperado',
        value: formatearMoneda(reporte.totalRecuperado),
        sub: `${reporte.cantidadPagos} pagos`,
      },
      {
        label: 'Ingreso empresa',
        value: formatearMoneda(reporte.totalIngresoEmpresa),
        tone: 'primary',
      },
      {
        label: 'Comisiones',
        value: formatearMoneda(reporte.totalComision),
      },
      {
        label: 'Ganancia neta',
        value: formatearMoneda(reporte.gananciaNeta),
        sub: `Margen ${reporte.margenPct}%`,
        tone: 'success',
      },
    ];
  }, [reporte]);

  const gestorColumns = useMemo<ColumnDef<ReporteGananciasGestorItem>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Gestor' },
      { accessorKey: 'cantidadPagos', header: 'Pagos' },
      {
        accessorKey: 'totalRecuperado',
        header: 'Recuperado',
        cell: ({ row }) => formatearMoneda(row.original.totalRecuperado),
      },
      {
        accessorKey: 'totalIngresoEmpresa',
        header: 'Ingreso',
        cell: ({ row }) => formatearMoneda(row.original.totalIngresoEmpresa),
      },
      {
        accessorKey: 'totalComision',
        header: 'Comisión',
        cell: ({ row }) => formatearMoneda(row.original.totalComision),
      },
      {
        accessorKey: 'gananciaNeta',
        header: 'Ganancia neta',
        cell: ({ row }) => formatearMoneda(row.original.gananciaNeta),
      },
      {
        accessorKey: 'margenPct',
        header: 'Margen %',
        cell: ({ row }) => `${row.original.margenPct}%`,
      },
    ],
    [],
  );

  const tramoColumns = useMemo<ColumnDef<ReporteGananciasTramoItem>[]>(
    () => [
      { accessorKey: 'tramo', header: 'Tramo mora' },
      { accessorKey: 'cantidadPagos', header: 'Pagos' },
      {
        accessorKey: 'totalRecuperado',
        header: 'Recuperado',
        cell: ({ row }) => formatearMoneda(row.original.totalRecuperado),
      },
      {
        accessorKey: 'totalIngresoEmpresa',
        header: 'Ingreso',
        cell: ({ row }) => formatearMoneda(row.original.totalIngresoEmpresa),
      },
      {
        accessorKey: 'totalComision',
        header: 'Comisión',
        cell: ({ row }) => formatearMoneda(row.original.totalComision),
      },
      {
        accessorKey: 'gananciaNeta',
        header: 'Ganancia neta',
        cell: ({ row }) => formatearMoneda(row.original.gananciaNeta),
      },
    ],
    [],
  );

  function clearFeedback(): void {
    setExportOk(null);
    setExportError(null);
  }

  function handleExport(): void {
    if (!reporte) {
      return;
    }
    clearFeedback();
    try {
      exportReporteGananciasXlsx(reporte);
      setExportOk('Archivo Excel descargado.');
    } catch {
      setExportError('No se pudo exportar el reporte.');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reporte de ganancias"
        description="Ingreso empresa, comisiones y ganancia neta por gestor y tramo de mora."
      />

      <div className="space-y-3 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex flex-wrap items-end gap-3">
          <MandanteSelect
            value={idmandante}
            onChange={(v) => {
              clearFeedback();
              setIdmandante(v);
            }}
            required
          />
          <div>
            <label
              htmlFor="periodo-ganancias"
              className="mb-1 block text-sm font-medium"
            >
              Periodo
            </label>
            <input
              id="periodo-ganancias"
              type="month"
              value={periodo}
              onChange={(e) => {
                clearFeedback();
                setPeriodo(e.target.value);
              }}
              className="rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!reporte || isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? 'Actualizando…' : 'Actualizar'}
          </Button>
          <Button type="button" disabled={!reporte} onClick={handleExport}>
            Exportar Excel
          </Button>
        </div>
        {exportOk ? (
          <p className="text-sm text-green-700 dark:text-green-400" role="status">
            {exportOk}
          </p>
        ) : null}
        {exportError ? (
          <p className="text-sm text-red-600" role="alert">
            {exportError}
          </p>
        ) : null}
      </div>

      {mandanteId === 0 ? (
        <p className="text-sm text-dark-5 dark:text-dark-6">
          Seleccione un mandante y el periodo para generar el reporte.
        </p>
      ) : (
        <AsyncPanel
          isLoading={isLoading}
          error={error}
          isEmpty={!reporte}
          emptyMessage="No se pudo cargar el reporte de ganancias."
        >
          {reporte ? (
            <div className="space-y-4">
              <DashboardMetricStrip metrics={metrics} />
              <ClientPaginatedDataTable
                columns={gestorColumns}
                data={reporte.porGestor}
                emptyMessage="Sin pagos aplicados en el periodo."
                itemLabel="gestores"
                initialPageSize={25}
              />
              <ClientPaginatedDataTable
                columns={tramoColumns}
                data={reporte.porTramoMora}
                emptyMessage="Sin desglose por tramo."
                itemLabel="tramos"
                initialPageSize={10}
              />
            </div>
          ) : null}
        </AsyncPanel>
      )}
    </div>
  );
}
