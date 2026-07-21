'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ViewRowButton } from '@/components/ui/row-action-buttons';
import { KpiCard } from '@/components/cobranza/kpi-card';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { usePagination } from '@/hooks/use-pagination';
import {
  GET_PAGOS_CONCILIACION,
  MARCAR_PAGO_APLICADO,
} from '@/lib/graphql/queries/cobranza.queries';
import { formatearMoneda } from '@/types/cobranza';
import { rutaComprobantePago } from '@/lib/logic/comprobante-pago-logic';


interface PagoConciliacionRow {
  idpago: number;
  idprestamo: number;
  noPrestamo: string;
  nombreCliente: string;
  fechaPago: string;
  monto: number;
  moneda: string;
  medio: string | null;
  aplicado: boolean;
}

export default function ConciliacionesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [soloPendientes, setSoloPendientes] = useState(true);
  const {
    queryVars,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
  } = usePagination({ initialPageSize: 20 });

  const mandanteId = idmandante === '' ? undefined : idmandante;

  const { data, isLoading, error } = useGraphQLQuery<{
    pagosConciliacion: {
      pagos: PagoConciliacionRow[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      pendientesTotal: number;
    };
  }>(GET_PAGOS_CONCILIACION, {
    ...queryVars,
    idmandante: mandanteId,
    soloPendientes,
  });

  const conciliacion = data?.pagosConciliacion;

  const conciliarMutation = useGraphQLMutation(MARCAR_PAGO_APLICADO, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_PAGOS_CONCILIACION] });
    },
  });

  const columns = useMemo<ColumnDef<PagoConciliacionRow>[]>(
    () => [
      { accessorKey: 'noPrestamo', header: 'No. préstamo' },
      { accessorKey: 'nombreCliente', header: 'Cliente' },
      {
        accessorKey: 'fechaPago',
        header: 'Fecha',
        cell: ({ row }) =>
          new Date(row.original.fechaPago).toLocaleDateString('es-NI'),
      },
      {
        accessorKey: 'monto',
        header: 'Monto',
        cell: ({ row }) =>
          formatearMoneda(row.original.monto, row.original.moneda),
      },
      {
        accessorKey: 'medio',
        header: 'Medio',
        cell: ({ row }) => row.original.medio ?? '—',
      },
      {
        accessorKey: 'aplicado',
        header: 'Estado',
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              row.original.aplicado
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30'
            }`}
          >
            {row.original.aplicado ? 'Conciliado' : 'Pendiente'}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conciliaciones"
        description="Pagos registrados pendientes de aplicar al saldo del préstamo."
        actions={
          <Link href="/cobranza/liquidaciones">
            <Button variant="outline">Ver liquidaciones</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Pendientes de conciliar"
          value={String(conciliacion?.pendientesTotal ?? '—')}
          href="/cobranza/conciliaciones"
          alert={(conciliacion?.pendientesTotal ?? 0) > 0}
        />
        <KpiCard
          label="En esta vista"
          value={String(conciliacion?.total ?? '—')}
          sub={soloPendientes ? 'Solo pendientes' : 'Todos los pagos'}
        />
      </div>

      <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MandanteSelect
            value={idmandante}
            onChange={(value) => {
              setIdmandante(value);
              resetPage();
            }}
            allowAll
            allLabel="Todos (permitidos)"
            label="Mandante"
            selectClassName="w-full rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
          />
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={soloPendientes}
                onChange={(e) => {
                  setSoloPendientes(e.target.checked);
                  resetPage();
                }}
              />
              Solo pendientes de conciliar
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20">
            {error.message}
          </div>
        )}

        <PaginatedDataTable
          data={conciliacion?.pagos ?? []}
          columns={columns}
          pagination={conciliacion}
          isLoading={isLoading}
          emptyMessage="No hay pagos en esta vista."
          onRowClick={(p) => router.push(`/cobranza/prestamos/${p.idprestamo}`)}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          itemLabel="pagos"
          rowActions={(p) => (
            <div className="flex justify-end gap-2">
              {!p.aplicado && (
                <Button
                  size="sm"
                  disabled={conciliarMutation.isPending}
                  onClick={() =>
                    conciliarMutation.mutate({ idpago: p.idpago, aplicado: true })
                  }
                >
                  Conciliar
                </Button>
              )}
              {p.aplicado && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={conciliarMutation.isPending}
                  onClick={() =>
                    conciliarMutation.mutate({ idpago: p.idpago, aplicado: false })
                  }
                >
                  Desmarcar
                </Button>
              )}
              <ViewRowButton
                label="Comprobante"
                onClick={() =>
                  router.push(rutaComprobantePago(p.idpago))
                }
              />
              <ViewRowButton
                label="Ver préstamo"
                onClick={() =>
                  router.push(`/cobranza/prestamos/${p.idprestamo}`)
                }
              />
            </div>
          )}
        />
      </div>
    </div>
  );
}
