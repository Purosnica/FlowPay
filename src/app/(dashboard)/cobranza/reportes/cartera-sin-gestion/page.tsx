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
import { GET_REPORTE_CARTERA_SIN_GESTION } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteCarteraSinGestionCsv } from '@/lib/cobranza/export-reportes-control-csv';
import {
  formatearMoneda,
  type ReporteCarteraSinGestion,
  type ReporteCarteraSinGestionItem,
} from '@/types/cobranza';

const DIAS_OPTIONS = [7, 15, 30] as const;

export default function ReporteCarteraSinGestionPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [diasSinGestion, setDiasSinGestion] = useState<number>(7);
  const [exportOk, setExportOk] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const mandanteId = idmandante === '' ? 0 : idmandante;

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteCarteraSinGestion: ReporteCarteraSinGestion;
  }>(
    GET_REPORTE_CARTERA_SIN_GESTION,
    { idmandante: mandanteId, diasSinGestion },
    { enabled: mandanteId > 0 },
  );

  const reporte = data?.reporteCarteraSinGestion;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    const base: DashboardMetric[] = [
      {
        label: `Sin gestión ≥ ${reporte.diasSinGestion}d`,
        value: String(reporte.totalPrestamos),
        sub: formatearMoneda(reporte.saldoTotal),
        tone: reporte.totalPrestamos > 0 ? 'warning' : 'success',
      },
    ];
    for (const t of reporte.resumenTramos) {
      base.push({
        label: `≥ ${t.diasUmbral} días`,
        value: String(t.cantidadPrestamos),
        sub: formatearMoneda(t.saldoTotal),
      });
    }
    return base;
  }, [reporte]);

  const columns = useMemo<ColumnDef<ReporteCarteraSinGestionItem>[]>(
    () => [
      { accessorKey: 'noPrestamo', header: 'N° Préstamo' },
      { accessorKey: 'nombreCliente', header: 'Cliente' },
      {
        accessorKey: 'nombreGestor',
        header: 'Gestor',
        cell: ({ row }) => row.original.nombreGestor ?? '—',
      },
      { accessorKey: 'diasMora', header: 'Días mora' },
      {
        accessorKey: 'saldoTotal',
        header: 'Saldo',
        cell: ({ row }) => formatearMoneda(row.original.saldoTotal),
      },
      {
        accessorKey: 'diasSinGestion',
        header: 'Días sin gestión',
        cell: ({ row }) =>
          row.original.diasSinGestion != null
            ? String(row.original.diasSinGestion)
            : 'Nunca',
      },
      {
        accessorKey: 'ultimaGestion',
        header: 'Última gestión',
        cell: ({ row }) => row.original.ultimaGestion ?? '—',
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
      exportReporteCarteraSinGestionCsv(reporte);
      setExportOk('Reporte de cartera sin gestión exportado.');
    } catch {
      setExportError('No se pudo exportar el reporte.');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cartera sin gestión"
        description="Casos activos sin contacto reciente: riesgo operativo y puntos de mejora."
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
              htmlFor="dias-sin-gestion"
              className="mb-1 block text-sm font-medium"
            >
              Días sin gestión
            </label>
            <select
              id="dias-sin-gestion"
              value={diasSinGestion}
              onChange={(e) => {
                clearFeedback();
                setDiasSinGestion(Number(e.target.value));
              }}
              className="rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3"
            >
              {DIAS_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} días
                </option>
              ))}
            </select>
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
            Exportar CSV
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
          Seleccione un mandante para ver la cartera sin gestión.
        </p>
      ) : (
        <AsyncPanel
          isLoading={isLoading}
          error={error}
          isEmpty={!reporte}
          emptyMessage="No se pudo cargar el reporte."
        >
          {reporte ? (
            <div className="space-y-4">
              <DashboardMetricStrip metrics={metrics} />
              <ClientPaginatedDataTable
                columns={columns}
                data={reporte.prestamos}
                emptyMessage="Sin préstamos sin gestión en el umbral seleccionado."
                itemLabel="préstamos"
                initialPageSize={25}
              />
            </div>
          ) : null}
        </AsyncPanel>
      )}
    </div>
  );
}
