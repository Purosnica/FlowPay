'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { PermissionGate } from '@/components/auth/permission-gate';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_CIERRES_DIARIOS,
  CREAR_CIERRE_DIARIO,
  GUARDAR_DECLARACION_CIERRE,
  ENVIAR_CIERRE_REVISION,
  CERRAR_CIERRE_DIARIO,
  REABRIR_CIERRE_DIARIO,
} from '@/lib/graphql/queries/cobranza.queries';
import { formatearMoneda } from '@/types/cobranza';
import { formatFechaNegocio } from '@/lib/utils/timezone';

type DetalleCierre = {
  iddetalle: number;
  medio: string;
  montoSistema: string;
  montoDeclarado: string;
  diferencia: string;
};

type Cierre = {
  idcierre: number;
  idmandante: number;
  fechaNegocio: string;
  idagencia: number | null;
  idusuarioCaja: number | null;
  estado: string;
  totalSistema: string;
  totalDeclarado: string;
  diferencia: string;
  creadoPor: number;
  revisadoPor: number | null;
  cerradoPor: number | null;
  motivoReapertura: string | null;
  reopenedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  detalles: DetalleCierre[];
};

const emptyPagination = {
  total: 0,
  page: 1,
  pageSize: 100,
  totalPages: 1,
};

function badge(estado: string) {
  if (estado === 'CERRADO') return 'bg-green-100 text-green-800';
  if (estado === 'PENDIENTE_REVISION') return 'bg-blue-100 text-blue-800';
  if (estado === 'REABIERTO') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-800';
}

export default function CierresDiariosPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [fechaNegocio, setFechaNegocio] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [estado, setEstado] = useState('');
  const [editando, setEditando] = useState<Cierre | null>(null);
  const [declarados, setDeclarados] = useState<Record<string, string>>({});

  const mandanteId = idmandante === '' ? undefined : idmandante;

  const { data, isLoading, error, refetch } = useGraphQLQuery<{
    cierresDiarios: Cierre[];
  }>(
    GET_CIERRES_DIARIOS,
    {
      idmandante: mandanteId,
      estado: estado || undefined,
      take: 100,
    },
    { enabled: mandanteId != null },
  );

  const cierres = data?.cierresDiarios ?? [];

  const crearMutation = useGraphQLMutation(CREAR_CIERRE_DIARIO, {
    successMessage: 'Cierre diario creado',
    onSuccess: () => refetch(),
  });
  const guardarMutation = useGraphQLMutation(GUARDAR_DECLARACION_CIERRE, {
    successMessage: 'Declaración guardada',
    onSuccess: () => {
      setEditando(null);
      refetch();
    },
  });
  const revisionMutation = useGraphQLMutation(ENVIAR_CIERRE_REVISION, {
    successMessage: 'Cierre enviado a revisión',
    onSuccess: () => refetch(),
  });
  const cerrarMutation = useGraphQLMutation(CERRAR_CIERRE_DIARIO, {
    successMessage: 'Cierre aprobado y cerrado',
    onSuccess: () => refetch(),
  });
  const reabrirMutation = useGraphQLMutation(REABRIR_CIERRE_DIARIO, {
    successMessage: 'Cierre reabierto',
    onSuccess: () => refetch(),
  });

  const iniciarEdicion = (cierre: Cierre) => {
    setEditando(cierre);
    setDeclarados(
      Object.fromEntries(
        cierre.detalles.map((d) => [d.medio, Number(d.montoDeclarado).toFixed(2)]),
      ),
    );
  };

  const columns = useMemo<ColumnDef<Cierre>[]>(
    () => [
      {
        accessorKey: 'fechaNegocio',
        header: 'Fecha',
        cell: ({ row }) => formatFechaNegocio(row.original.fechaNegocio),
      },
      { accessorKey: 'idcierre', header: 'Cierre' },
      {
        accessorKey: 'totalSistema',
        header: 'Sistema',
        cell: ({ row }) => formatearMoneda(Number(row.original.totalSistema)),
      },
      {
        accessorKey: 'totalDeclarado',
        header: 'Declarado',
        cell: ({ row }) => formatearMoneda(Number(row.original.totalDeclarado)),
      },
      {
        accessorKey: 'diferencia',
        header: 'Diferencia',
        cell: ({ row }) => (
          <span
            className={
              Number(row.original.diferencia) === 0
                ? 'text-green-700'
                : 'font-semibold text-red-700'
            }
          >
            {formatearMoneda(Number(row.original.diferencia))}
          </span>
        ),
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge(row.original.estado)}`}>
            {row.original.estado}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <PermissionGate
      permiso={PERMISO.CIERRE_VIEW}
      fallback={
        <p className="text-sm text-gray-500">
          No tienes permiso para consultar cierres diarios.
        </p>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title="Cierre diario"
          description="Arquee pagos por fecha de negocio, compare declarado vs. sistema y cierre el período con trazabilidad."
        />

        <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
          <div className="grid gap-4 md:grid-cols-3">
            <MandanteSelect
              value={idmandante}
              onChange={(value) => {
                setIdmandante(value);
                setEditando(null);
              }}
              label="Mandante"
              required
            />
            <div>
              <label className="mb-1 block text-sm font-medium">
                Fecha de negocio
              </label>
              <input
                type="date"
                value={fechaNegocio}
                onChange={(e) => setFechaNegocio(e.target.value)}
                className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
              />
            </div>
            <div className="flex items-end gap-2">
              <PermissionGate permiso={PERMISO.CIERRE_CREATE}>
                <Button
                  disabled={!mandanteId || crearMutation.isPending}
                  onClick={() => {
                    if (!mandanteId) return;
                    crearMutation.mutate({
                      idmandante: mandanteId,
                      fechaNegocio: new Date(
                        `${fechaNegocio}T12:00:00-06:00`,
                      ).toISOString(),
                    });
                  }}
                >
                  Crear / abrir cierre
                </Button>
              </PermissionGate>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
          <div className="max-w-xs">
            <label className="mb-1 block text-sm font-medium">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
            >
              <option value="">Todos</option>
              <option value="ABIERTO">Abierto</option>
              <option value="PENDIENTE_REVISION">Pendiente de revisión</option>
              <option value="CERRADO">Cerrado</option>
              <option value="REABIERTO">Reabierto</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20">
            {error.message}
          </div>
        )}

        <PaginatedDataTable
          data={cierres}
          columns={columns}
          pagination={{ ...emptyPagination, total: cierres.length }}
          isLoading={isLoading}
          emptyMessage={
            mandanteId ? 'No hay cierres para este filtro.' : 'Seleccione un mandante.'
          }
          itemLabel="cierres"
          onPageChange={() => undefined}
          onPageSizeChange={() => undefined}
          rowActions={(cierre) => (
            <div className="flex flex-wrap justify-end gap-2">
              <PermissionGate permiso={PERMISO.CIERRE_CREATE}>
                {['ABIERTO', 'REABIERTO'].includes(cierre.estado) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => iniciarEdicion(cierre)}
                  >
                    Declarar
                  </Button>
                )}
              </PermissionGate>
              <PermissionGate permiso={PERMISO.CIERRE_REVIEW}>
                {['ABIERTO', 'REABIERTO'].includes(cierre.estado) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={revisionMutation.isPending}
                    onClick={() =>
                      revisionMutation.mutate({ idcierre: cierre.idcierre })
                    }
                  >
                    Enviar a revisión
                  </Button>
                )}
              </PermissionGate>
              <PermissionGate permiso={PERMISO.CIERRE_CLOSE}>
                {cierre.estado === 'PENDIENTE_REVISION' && (
                  <Button
                    size="sm"
                    disabled={cerrarMutation.isPending}
                    onClick={() =>
                      cerrarMutation.mutate({ idcierre: cierre.idcierre })
                    }
                  >
                    Cerrar
                  </Button>
                )}
              </PermissionGate>
              <PermissionGate permiso={PERMISO.CIERRE_REOPEN}>
                {cierre.estado === 'CERRADO' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reabrirMutation.isPending}
                    onClick={() => {
                      const motivo = window.prompt('Motivo de reapertura:');
                      if (!motivo || motivo.trim().length < 5) return;
                      reabrirMutation.mutate({
                        idcierre: cierre.idcierre,
                        motivo: motivo.trim(),
                      });
                    }}
                  >
                    Reabrir
                  </Button>
                )}
              </PermissionGate>
            </div>
          )}
        />

        {editando && (
          <div className="rounded-lg border border-primary/30 bg-white p-5 shadow-1 dark:bg-gray-dark">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  Declaración del cierre #{editando.idcierre}
                </h2>
                <p className="text-sm text-gray-500">
                  {formatFechaNegocio(editando.fechaNegocio)}
                </p>
              </div>
              <Button variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Medio</th>
                    <th className="py-2">Sistema</th>
                    <th className="py-2">Declarado</th>
                    <th className="py-2">Diferencia actual</th>
                  </tr>
                </thead>
                <tbody>
                  {editando.detalles.map((detalle) => (
                    <tr key={detalle.medio} className="border-b border-stroke/50">
                      <td className="py-2 font-medium">{detalle.medio}</td>
                      <td className="py-2">
                        {formatearMoneda(Number(detalle.montoSistema))}
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={declarados[detalle.medio] ?? '0.00'}
                          onChange={(e) =>
                            setDeclarados((prev) => ({
                              ...prev,
                              [detalle.medio]: e.target.value,
                            }))
                          }
                          className="w-36 rounded border border-stroke px-2 py-1 dark:border-dark-3 dark:bg-dark-2"
                        />
                      </td>
                      <td className="py-2">
                        {formatearMoneda(Number(detalle.diferencia))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                disabled={guardarMutation.isPending}
                onClick={() =>
                  guardarMutation.mutate({
                    idcierre: editando.idcierre,
                    declarados: editando.detalles.map((d) => ({
                      medio: d.medio,
                      montoDeclarado: declarados[d.medio] || '0.00',
                    })),
                  })
                }
              >
                {guardarMutation.isPending ? 'Guardando...' : 'Guardar declaración'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
