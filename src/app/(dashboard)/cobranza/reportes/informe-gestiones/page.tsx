'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ReporteFiltrosBar } from '@/components/cobranza/reporte-filtros-bar';
import { ReporteTableSection } from '@/components/cobranza/reporte-table-section';
import {
  cellMoneda,
  cellTexto,
} from '@/components/cobranza/reporte-table-cells';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { ReporteAsyncContent } from '@/components/cobranza/reporte-async-content';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useReporteExportFeedback } from '@/hooks/use-reporte-export-feedback';
import { GET_INFORME_GESTIONES } from '@/lib/graphql/queries/cobranza.queries';
import { exportInformeGestionesXlsx } from '@/lib/cobranza/export-informe-gestiones-xlsx';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import type {
  InformeGestionItem,
  InformeGestiones,
} from '@/types/cobranza';

export default function InformeGestionesPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    informeGestiones: InformeGestiones;
  }>(
    GET_INFORME_GESTIONES,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const informe = data?.informeGestiones;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!informe) {
      return [];
    }
    return [
      {
        label: 'Total gestiones',
        value: String(informe.totalGestiones),
        sub: `${informe.mandanteNombre} · ${informe.periodo}`,
        tone: 'primary',
      },
    ];
  }, [informe]);

  const columns = useMemo<ColumnDef<InformeGestionItem>[]>(
    () => [
      {
        accessorKey: 'noPrestamo',
        header: 'N° Préstamo',
        cell: ({ row }) => cellTexto(row.original.noPrestamo),
      },
      {
        accessorKey: 'codigoUnico',
        header: 'Código único',
        cell: ({ row }) => cellTexto(row.original.codigoUnico),
      },
      {
        accessorKey: 'nombreCliente',
        header: 'Cliente',
        cell: ({ row }) => cellTexto(row.original.nombreCliente),
      },
      {
        accessorKey: 'gestor',
        header: 'Gestor',
        cell: ({ row }) => cellTexto(row.original.gestor),
      },
      {
        accessorKey: 'fechaGestion',
        header: 'Fecha gestión',
        cell: ({ row }) => cellTexto(row.original.fechaGestion),
      },
      {
        accessorKey: 'codigoAccion',
        header: 'COD_ACC',
        cell: ({ row }) => cellTexto(row.original.codigoAccion),
      },
      {
        accessorKey: 'codigoResultado',
        header: 'COD_RES',
        cell: ({ row }) => cellTexto(row.original.codigoResultado),
      },
      {
        accessorKey: 'nota',
        header: 'Nota',
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-xs">
            {cellTexto(row.original.nota)}
          </span>
        ),
      },
      {
        accessorKey: 'tipificacion',
        header: 'Tipificación',
        cell: ({ row }) => cellTexto(row.original.tipificacion),
      },
      {
        accessorKey: 'pagos',
        header: 'Pagos',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.pagos),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Informe de gestiones"
        description="Gestiones de cobradores y supervisores en el formato de plantilla REGISTROS."
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
        periodoId="periodo-informe-gestiones"
        canExport={Boolean(informe && informe.gestiones.length > 0)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!informe) return;
          runExport(
            () =>
              exportInformeGestionesXlsx(informe.gestiones, {
                mandanteNombre: informe.mandanteNombre,
                periodo: informe.periodo,
              }),
            'Informe de gestiones exportado a Excel.',
          );
        }}
      />

      {mandanteId === 0 ? (
        <p className="text-sm text-gray-5">
          Seleccione un mandante y el periodo para generar el informe.
        </p>
      ) : (
        <ReporteAsyncContent
          isLoading={isLoading}
          error={error}
          hasData={Boolean(informe)}
        >
          {informe ? (
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                  Resumen
                </h2>
                <DashboardMetricStrip metrics={metrics} />
              </div>
              <ReporteTableSection
                title="Gestiones del periodo"
                description={`${informe.mandanteNombre} · Periodo ${informe.periodo}`}
                columns={columns}
                data={informe.gestiones}
                emptyMessage="Sin gestiones en el periodo seleccionado."
                itemLabel="gestiones"
                initialPageSize={20}
                resetKey={`${mandanteId}-${periodo}`}
              />
            </div>
          ) : null}
        </ReporteAsyncContent>
      )}
    </div>
  );
}
