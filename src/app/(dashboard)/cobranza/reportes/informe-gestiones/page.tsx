'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ClientPaginatedDataTable } from '@/components/cobranza/client-paginated-data-table';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { AsyncPanel } from '@/components/ui/async-panel';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_INFORME_GESTIONES } from '@/lib/graphql/queries/cobranza.queries';
import { exportInformeGestionesXlsx } from '@/lib/cobranza/export-informe-gestiones-xlsx';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type InformeGestionItem,
  type InformeGestiones,
} from '@/types/cobranza';

export default function InformeGestionesPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportOk, setExportOk] = useState<string | null>(null);

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

  const columns = useMemo<ColumnDef<InformeGestionItem>[]>(
    () => [
      { accessorKey: 'noPrestamo', header: 'N° Préstamo' },
      { accessorKey: 'codigoUnico', header: 'Código único' },
      { accessorKey: 'nombreCliente', header: 'Cliente' },
      { accessorKey: 'gestor', header: 'Gestor' },
      { accessorKey: 'fechaGestion', header: 'Fecha gestión' },
      { accessorKey: 'codigoAccion', header: 'COD_ACC' },
      { accessorKey: 'codigoResultado', header: 'COD_RES' },
      {
        accessorKey: 'nota',
        header: 'Nota',
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-xs">{row.original.nota}</span>
        ),
      },
      { accessorKey: 'tipificacion', header: 'Tipificación' },
      {
        accessorKey: 'pagos',
        header: 'Pagos',
        cell: ({ row }) => formatearMoneda(row.original.pagos),
      },
    ],
    [],
  );

  function clearFeedback(): void {
    setExportError(null);
    setExportOk(null);
  }

  function handleExportExcel(): void {
    if (!informe) {
      return;
    }
    clearFeedback();
    try {
      exportInformeGestionesXlsx(informe.gestiones, {
        mandanteNombre: informe.mandanteNombre,
        periodo: informe.periodo,
      });
      setExportOk('Informe de gestiones exportado a Excel.');
    } catch {
      setExportError('No se pudo generar el Excel de gestiones.');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Informe de gestiones"
        description="Gestiones de cobradores y supervisores en el formato de plantilla REGISTROS."
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
              htmlFor="periodo-informe-gestiones"
              className="mb-1 block text-sm font-medium"
            >
              Periodo
            </label>
            <input
              id="periodo-informe-gestiones"
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
            disabled={!informe || isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? 'Actualizando…' : 'Actualizar'}
          </Button>
          <Button
            type="button"
            disabled={!informe || informe.gestiones.length === 0}
            onClick={handleExportExcel}
          >
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
          Seleccione un mandante y el periodo para generar el informe.
        </p>
      ) : (
        <AsyncPanel
          isLoading={isLoading}
          error={error}
          isEmpty={!informe}
          emptyMessage="No se pudo cargar el informe de gestiones."
        >
          {informe ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-stroke bg-white p-3 dark:border-dark-3 dark:bg-gray-dark">
                <p className="text-sm text-dark-5 dark:text-dark-6">
                  {informe.mandanteNombre} · Periodo {informe.periodo}
                </p>
                <p className="text-lg font-semibold text-dark dark:text-white">
                  {informe.totalGestiones} gestiones
                </p>
              </div>
              <ClientPaginatedDataTable
                columns={columns}
                data={informe.gestiones}
                emptyMessage="Sin gestiones en el periodo seleccionado."
                itemLabel="gestiones"
                initialPageSize={25}
              />
            </div>
          ) : null}
        </AsyncPanel>
      )}
    </div>
  );
}
