'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { PageHeader } from '@/components/ui/page-header';
import { AsyncPanel } from '@/components/ui/async-panel';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { usePagination } from '@/hooks/use-pagination';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_LIQUIDACIONES,
  GET_LIQUIDACION_DETALLE,
  SIMULAR_LIQUIDACION,
  GENERAR_LIQUIDACION,
  EMITIR_LIQUIDACION,
  MARCAR_LIQUIDACION_PAGADA,
  REVERTIR_LIQUIDACION_PAGADA,
  ANULAR_LIQUIDACION,
} from '@/lib/graphql/queries/cobranza.queries';
import {
  type Liquidacion,
  type SimulacionLiquidacion,
  formatearMoneda,
} from '@/types/cobranza';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import { crearIdempotencyKey } from '@/lib/api/idempotency-key';

type ConfirmLiq =
  | { tipo: 'anular'; id: number }
  | { tipo: 'revertir'; id: number }
  | null;

function estadoBadge(estado: string): string {
  switch (estado) {
    case 'BORRADOR':
      return 'bg-amber-100 text-amber-800';
    case 'EMITIDA':
      return 'bg-blue-100 text-blue-800';
    case 'PAGADA':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function LiquidacionesPage() {
  const queryClient = useQueryClient();
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [idempotencyKey, setIdempotencyKey] = useState(crearIdempotencyKey);
  const [simulacion, setSimulacion] = useState<SimulacionLiquidacion | null>(
    null,
  );
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [confirmLiq, setConfirmLiq] = useState<ConfirmLiq>(null);
  const {
    queryVars,
    resetPage,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination();

  const mandanteId = idmandante === '' ? 0 : idmandante;

  const { data, isLoading, error, refetch } = useGraphQLQuery<{
    liquidaciones: {
      liquidaciones: Liquidacion[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(
    GET_LIQUIDACIONES,
    { idmandante: mandanteId, ...queryVars },
    { enabled: mandanteId > 0 },
  );

  const liquidacionesData = data?.liquidaciones;

  const { data: detalleData, isLoading: loadingDetalle } = useGraphQLQuery<{
    liquidacionDetalle: Array<{
      noPrestamo: string;
      nombreGestor: string | null;
      monto: number;
      diasMora: number;
      montoComision: number;
      ingresoEmpresa: number;
    }>;
  }>(GET_LIQUIDACION_DETALLE, { idliquidacion: detalleId ?? 0 }, {
    enabled: detalleId != null && detalleId > 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [GET_LIQUIDACIONES] });
  };

  const simularMutation = useGraphQLMutation<
    { simularLiquidacion: SimulacionLiquidacion },
    { idmandante: number; periodo: string }
  >(SIMULAR_LIQUIDACION, {
    onSuccess: (res) => setSimulacion(res.simularLiquidacion),
  });

  const generarMutation = useGraphQLMutation(GENERAR_LIQUIDACION, {
    onSuccess: () => {
      invalidate();
      refetch();
      setSimulacion(null);
      setIdempotencyKey(crearIdempotencyKey());
    },
  });

  const emitirMutation = useGraphQLMutation(EMITIR_LIQUIDACION, {
    onSuccess: () => {
      invalidate();
      refetch();
    },
  });

  const pagadaMutation = useGraphQLMutation(MARCAR_LIQUIDACION_PAGADA, {
    onSuccess: () => {
      invalidate();
      refetch();
    },
  });

  const revertirPagadaMutation = useGraphQLMutation(
    REVERTIR_LIQUIDACION_PAGADA,
    {
      onSuccess: () => {
        invalidate();
        refetch();
      },
    },
  );

  const anularMutation = useGraphQLMutation(ANULAR_LIQUIDACION, {
    onSuccess: () => {
      invalidate();
      refetch();
    },
  });

  const columns = useMemo<ColumnDef<Liquidacion>[]>(
    () => [
      { accessorKey: 'periodo', header: 'Periodo' },
      {
        accessorKey: 'mandante.nombre',
        header: 'Mandante',
        cell: ({ row }) => row.original.mandante?.nombre ?? '-',
      },
      {
        accessorKey: 'totalRecuperado',
        header: 'Recuperado',
        cell: ({ row }) => formatearMoneda(row.original.totalRecuperado),
      },
      {
        accessorKey: 'totalComision',
        header: 'Comisión cobradores',
        cell: ({ row }) => formatearMoneda(row.original.totalComision),
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${estadoBadge(row.original.estado)}`}
          >
            {row.original.estado}
          </span>
        ),
      },
      {
        id: 'acciones',
        header: 'Acciones',
        cell: ({ row }) => {
          const liq = row.original;
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDetalleId(liq.idliquidacion)}
              >
                Detalle
              </Button>
              <PermissionGate permiso={PERMISO.LIQUIDACION_WRITE}>
                {liq.estado === 'BORRADOR' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={emitirMutation.isPending}
                    onClick={() =>
                      emitirMutation.mutate({
                        idliquidacion: liq.idliquidacion,
                      })
                    }
                  >
                    Emitir
                  </Button>
                )}
                {liq.estado === 'EMITIDA' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagadaMutation.isPending}
                    onClick={() =>
                      pagadaMutation.mutate({
                        idliquidacion: liq.idliquidacion,
                      })
                    }
                  >
                    Marcar pagada
                  </Button>
                )}
                {liq.estado === 'PAGADA' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={revertirPagadaMutation.isPending}
                    onClick={() =>
                      setConfirmLiq({
                        tipo: 'revertir',
                        id: liq.idliquidacion,
                      })
                    }
                  >
                    Revertir pago
                  </Button>
                )}
                {(liq.estado === 'BORRADOR' ||
                  liq.estado === 'EMITIDA' ||
                  liq.estado === 'PAGADA') && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={anularMutation.isPending}
                    onClick={() =>
                      setConfirmLiq({
                        tipo: 'anular',
                        id: liq.idliquidacion,
                      })
                    }
                  >
                    Anular
                  </Button>
                )}
              </PermissionGate>
            </div>
          );
        },
      },
    ],
    [
      emitirMutation,
      pagadaMutation,
      revertirPagadaMutation,
      anularMutation,
    ],
  );

  const handleSimular = () => {
    if (!mandanteId || !periodo) {
      return;
    }
    simularMutation.mutate({ idmandante: mandanteId, periodo });
  };

  const handleGenerar = () => {
    if (!mandanteId || !periodo) {
      return;
    }
    generarMutation.mutate({
      idmandante: mandanteId,
      periodo,
      idempotencyKey,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liquidaciones"
        description="Calcule comisiones de cobradores por periodo (sobre ingreso de la empresa) y gestione el ciclo de liquidación."
      />

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-dark">
        <div className="grid gap-4 sm:grid-cols-3">
          <MandanteSelect
            value={idmandante}
            onChange={(value) => {
              setIdmandante(value);
              resetPage();
              setSimulacion(null);
              setIdempotencyKey(crearIdempotencyKey());
            }}
            label="Mandante"
            selectClassName="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
          <div>
            <label className="mb-1 block text-sm font-medium">
              Periodo (YYYY-MM)
            </label>
            <input
              type="month"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={periodo}
              onChange={(e) => {
                setPeriodo(e.target.value);
                setSimulacion(null);
                setIdempotencyKey(crearIdempotencyKey());
              }}
            />
          </div>
          <div className="flex items-end gap-2">
            <PermissionGate permiso={PERMISO.LIQUIDACION_WRITE}>
              <Button
                variant="outline"
                disabled={!mandanteId || simularMutation.isPending}
                onClick={handleSimular}
              >
                Simular
              </Button>
              <Button
                disabled={!mandanteId || generarMutation.isPending}
                onClick={handleGenerar}
              >
                Generar borrador
              </Button>
            </PermissionGate>
          </div>
        </div>

        {simulacion && (
          <div className="mt-4 rounded border border-dashed border-gray-300 p-4 dark:border-gray-600">
            <h3 className="mb-2 font-medium">
              Vista previa — {simulacion.periodo}
            </h3>
            <div className="grid gap-2 text-sm sm:grid-cols-4">
              <p>
                Pagos: <strong>{simulacion.cantidadPagos}</strong>
              </p>
              <p>
                Recuperado:{' '}
                <strong>{formatearMoneda(simulacion.totalRecuperado)}</strong>
              </p>
              <p>
                Ingreso empresa:{' '}
                <strong>
                  {formatearMoneda(simulacion.totalIngresoEmpresa)}
                </strong>
              </p>
              <p>
                Comisión cobradores:{' '}
                <strong>{formatearMoneda(simulacion.totalComision)}</strong>
              </p>
            </div>
            {simulacion.detalle.length > 0 && (
              <div className="mt-3 max-h-48 overflow-auto text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-1">Préstamo</th>
                      <th className="py-1">Cobrador</th>
                      <th className="py-1">Recuperado</th>
                      <th className="py-1">% rec.</th>
                      <th className="py-1">Ingreso</th>
                      <th className="py-1">% cob.</th>
                      <th className="py-1">Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulacion.detalle.map((d) => (
                      <tr key={d.idpago} className="border-b border-gray-100">
                        <td className="py-1">{d.noPrestamo}</td>
                        <td className="py-1">{d.nombreGestor ?? '—'}</td>
                        <td className="py-1">{formatearMoneda(d.monto)}</td>
                        <td className="py-1">{d.porcentajeRecuperacion}%</td>
                        <td className="py-1">
                          {formatearMoneda(d.ingresoEmpresa)}
                        </td>
                        <td className="py-1">
                          {d.porcentajeComisionCobrador}%
                        </td>
                        <td className="py-1">
                          {formatearMoneda(d.montoComision)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">
          Error al cargar liquidaciones. Verifique permisos LIQUIDACION_READ.
        </p>
      )}

      <PaginatedDataTable
        columns={columns}
        data={liquidacionesData?.liquidaciones ?? []}
        pagination={liquidacionesData}
        isLoading={isLoading && mandanteId > 0}
        emptyMessage={
          mandanteId
            ? 'No hay liquidaciones para este mandante.'
            : 'Seleccione un mandante.'
        }
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="liquidaciones"
      />

      <Modal
        isOpen={detalleId != null}
        onClose={() => setDetalleId(null)}
        title="Detalle de liquidación"
        size="lg"
      >
        <AsyncPanel
          isLoading={loadingDetalle}
          isEmpty={(detalleData?.liquidacionDetalle ?? []).length === 0}
          loadingMessage="Cargando líneas..."
          emptyMessage="Sin detalle guardado. Genere o regenere el borrador."
        >
          <div className="max-h-96 overflow-auto text-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="py-2">Préstamo</th>
                  <th className="py-2">Cobrador</th>
                  <th className="py-2">Monto</th>
                  <th className="py-2">Comisión</th>
                </tr>
              </thead>
              <tbody>
                {detalleData?.liquidacionDetalle.map((d, i) => (
                  <tr key={i} className="border-b border-stroke/50">
                    <td className="py-2">{d.noPrestamo}</td>
                    <td className="py-2">{d.nombreGestor ?? '—'}</td>
                    <td className="py-2">{formatearMoneda(d.monto)}</td>
                    <td className="py-2">{formatearMoneda(d.montoComision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncPanel>
      </Modal>

      <ConfirmDialog
        isOpen={confirmLiq != null}
        onClose={() => setConfirmLiq(null)}
        title={
          confirmLiq?.tipo === 'anular'
            ? 'Anular liquidación'
            : 'Revertir pago de liquidación'
        }
        description={
          confirmLiq?.tipo === 'anular'
            ? 'La liquidación quedará anulada. Esta acción queda auditada.'
            : 'Se revertirá el estado pagada. Confirme solo si el pago no se concretó.'
        }
        confirmLabel={
          confirmLiq?.tipo === 'anular' ? 'Anular' : 'Revertir pago'
        }
        variant="danger"
        isLoading={
          anularMutation.isPending || revertirPagadaMutation.isPending
        }
        onConfirm={() => {
          if (!confirmLiq) {
            return;
          }
          if (confirmLiq.tipo === 'anular') {
            anularMutation.mutate(
              { idliquidacion: confirmLiq.id },
              { onSuccess: () => setConfirmLiq(null) },
            );
            return;
          }
          revertirPagadaMutation.mutate(
            { idliquidacion: confirmLiq.id },
            { onSuccess: () => setConfirmLiq(null) },
          );
        }}
      />
    </div>
  );
}
