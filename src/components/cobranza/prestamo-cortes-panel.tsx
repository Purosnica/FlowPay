'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { usePaginatedPanel } from '@/hooks/use-paginated-panel';
import { GET_CORTES_PRESTAMO } from '@/lib/graphql/queries/cobranza.queries';
import { type PrestamoCorte , formatearMoneda } from '@/types/cobranza';


interface PrestamoCortesPanelProps {
  idprestamo: number;
  moneda?: string;
}

export function PrestamoCortesPanel({
  idprestamo,
  moneda = 'NIO',
}: PrestamoCortesPanelProps) {
  const { queryVars, handlePageChange, handlePageSizeChange } =
    usePaginatedPanel({ scopeKey: idprestamo, initialPageSize: 10 });

  const { data, isLoading } = useGraphQLQuery<{
    cortesPrestamo: {
      cortes: PrestamoCorte[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_CORTES_PRESTAMO, { idprestamo, ...queryVars });

  const pageData = data?.cortesPrestamo;

  const columns = useMemo<ColumnDef<PrestamoCorte>[]>(
    () => [
      {
        accessorKey: 'fechaCorte',
        header: 'Fecha corte',
        cell: ({ row }) =>
          new Date(row.original.fechaCorte).toLocaleDateString('es-NI'),
      },
      {
        accessorKey: 'saldoTotal',
        header: 'Saldo',
        cell: ({ row }) =>
          formatearMoneda(Number(row.original.saldoTotal), moneda),
      },
      { accessorKey: 'diasMora', header: 'Días mora' },
      { accessorKey: 'estado', header: 'Estado' },
    ],
    [moneda],
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Historial de cortes por campaña / fecha de carga.
      </p>
      <PaginatedDataTable
        data={pageData?.cortes ?? []}
        columns={columns}
        pagination={pageData}
        isLoading={isLoading}
        emptyMessage="Sin cortes registrados."
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="cortes"
      />
    </div>
  );
}
