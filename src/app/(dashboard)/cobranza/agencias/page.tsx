'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { usePagination } from '@/hooks/use-pagination';
import { usePuede } from '@/hooks/use-permisos';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  CREATE_AGENCIA,
  CREATE_RUTA,
  DELETE_AGENCIA,
  DELETE_RUTA,
  GET_AGENCIAS,
  GET_RUTAS,
  UPDATE_AGENCIA,
  UPDATE_RUTA,
} from '@/lib/graphql/queries/cobranza.queries';
import type { Agencia, Ruta } from '@/types/cobranza';

type AgenciaFormState = {
  idagencia?: number;
  codigo: string;
  nombre: string;
  estado: boolean;
};

type RutaFormState = {
  idruta?: number;
  idagencia: number | '';
  nombre: string;
  estado: boolean;
};

const emptyAgencia = (): AgenciaFormState => ({
  codigo: '',
  nombre: '',
  estado: true,
});

const emptyRuta = (): RutaFormState => ({
  idagencia: '',
  nombre: '',
  estado: true,
});

export default function AgenciasPage() {
  const puedeEscribir = usePuede(PERMISO.CARTERA_WRITE);
  const [idagencia, setIdagencia] = useState<number | ''>('');
  const [agenciaForm, setAgenciaForm] = useState<AgenciaFormState>(emptyAgencia);
  const [rutaForm, setRutaForm] = useState<RutaFormState>(emptyRuta);
  const [formError, setFormError] = useState<string | null>(null);
  const agenciasPagination = usePagination();
  const rutasPagination = usePagination();

  const {
    data: agenciasData,
    isLoading: loadingAgencias,
    refetch: refetchAgencias,
  } = useGraphQLQuery<{
    agencias: {
      agencias: Agencia[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_AGENCIAS, {
    ...agenciasPagination.queryVars,
    incluirInactivas: puedeEscribir,
  });

  const {
    data: rutasData,
    isLoading: loadingRutas,
    refetch: refetchRutas,
  } = useGraphQLQuery<{
    rutas: {
      rutas: Ruta[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_RUTAS, {
    idagencia: idagencia || undefined,
    ...rutasPagination.queryVars,
    incluirInactivas: puedeEscribir,
  });

  const createAgencia = useGraphQLMutation(CREATE_AGENCIA);
  const updateAgencia = useGraphQLMutation(UPDATE_AGENCIA);
  const deleteAgencia = useGraphQLMutation(DELETE_AGENCIA);
  const createRuta = useGraphQLMutation(CREATE_RUTA);
  const updateRuta = useGraphQLMutation(UPDATE_RUTA);
  const deleteRuta = useGraphQLMutation(DELETE_RUTA);

  const agenciaColumns = useMemo<ColumnDef<Agencia>[]>(
    () => [
      { accessorKey: 'codigo', header: 'Código' },
      { accessorKey: 'nombre', header: 'Nombre' },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (row.original.estado ? 'Activa' : 'Inactiva'),
      },
      ...(puedeEscribir
        ? [
            {
              id: 'acciones',
              header: 'Acciones',
              cell: ({ row }: { row: { original: Agencia } }) => (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setAgenciaForm({
                        idagencia: row.original.idagencia,
                        codigo: row.original.codigo,
                        nombre: row.original.nombre,
                        estado: row.original.estado,
                      })
                    }
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void (async () => {
                        setFormError(null);
                        try {
                          await deleteAgencia.mutateAsync({
                            idagencia: row.original.idagencia,
                          });
                          void refetchAgencias();
                          void refetchRutas();
                        } catch (err) {
                          setFormError(
                            err instanceof Error
                              ? err.message
                              : 'No se pudo eliminar',
                          );
                        }
                      })();
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              ),
            } as ColumnDef<Agencia>,
          ]
        : []),
    ],
    [puedeEscribir, deleteAgencia, refetchAgencias, refetchRutas],
  );

  const rutaColumns = useMemo<ColumnDef<Ruta>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Ruta' },
      {
        id: 'agencia',
        header: 'Agencia',
        cell: ({ row }) =>
          row.original.agencia
            ? `${row.original.agencia.codigo} — ${row.original.agencia.nombre}`
            : '-',
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (row.original.estado ? 'Activa' : 'Inactiva'),
      },
      ...(puedeEscribir
        ? [
            {
              id: 'acciones',
              header: 'Acciones',
              cell: ({ row }: { row: { original: Ruta } }) => (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setRutaForm({
                        idruta: row.original.idruta,
                        idagencia: row.original.idagencia,
                        nombre: row.original.nombre,
                        estado: row.original.estado,
                      })
                    }
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void (async () => {
                        setFormError(null);
                        try {
                          await deleteRuta.mutateAsync({
                            idruta: row.original.idruta,
                          });
                          void refetchRutas();
                        } catch (err) {
                          setFormError(
                            err instanceof Error
                              ? err.message
                              : 'No se pudo eliminar',
                          );
                        }
                      })();
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              ),
            } as ColumnDef<Ruta>,
          ]
        : []),
    ],
    [puedeEscribir, deleteRuta, refetchRutas],
  );

  async function guardarAgencia(): Promise<void> {
    setFormError(null);
    try {
      if (agenciaForm.idagencia) {
        await updateAgencia.mutateAsync({
          input: {
            idagencia: agenciaForm.idagencia,
            codigo: agenciaForm.codigo,
            nombre: agenciaForm.nombre,
            estado: agenciaForm.estado,
          },
        });
      } else {
        await createAgencia.mutateAsync({
          input: {
            codigo: agenciaForm.codigo,
            nombre: agenciaForm.nombre,
            estado: agenciaForm.estado,
          },
        });
      }
      setAgenciaForm(emptyAgencia());
      void refetchAgencias();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'No se pudo guardar agencia',
      );
    }
  }

  async function guardarRuta(): Promise<void> {
    setFormError(null);
    if (!rutaForm.idagencia) {
      setFormError('Seleccione una agencia para la ruta.');
      return;
    }
    try {
      if (rutaForm.idruta) {
        await updateRuta.mutateAsync({
          input: {
            idruta: rutaForm.idruta,
            idagencia: rutaForm.idagencia,
            nombre: rutaForm.nombre,
            estado: rutaForm.estado,
          },
        });
      } else {
        await createRuta.mutateAsync({
          input: {
            idagencia: rutaForm.idagencia,
            nombre: rutaForm.nombre,
            estado: rutaForm.estado,
          },
        });
      }
      setRutaForm(emptyRuta());
      void refetchRutas();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'No se pudo guardar ruta',
      );
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agencias y rutas"
        description="Catálogo operativo (importación y administración manual)."
      />
      {formError && <p className="text-sm text-red">{formError}</p>}

      <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
        <section className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 font-semibold">
            {agenciaForm.idagencia ? 'Editar agencia' : 'Nueva agencia'}
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              Código
              <input
                className="mt-1 block rounded border px-3 py-2"
                value={agenciaForm.codigo}
                onChange={(e) =>
                  setAgenciaForm((f) => ({ ...f, codigo: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              Nombre
              <input
                className="mt-1 block rounded border px-3 py-2"
                value={agenciaForm.nombre}
                onChange={(e) =>
                  setAgenciaForm((f) => ({ ...f, nombre: e.target.value }))
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={agenciaForm.estado}
                onChange={(e) =>
                  setAgenciaForm((f) => ({ ...f, estado: e.target.checked }))
                }
              />
              Activa
            </label>
            <Button
              onClick={() => {
                void guardarAgencia();
              }}
            >
              Guardar
            </Button>
            {agenciaForm.idagencia && (
              <Button
                variant="outline"
                onClick={() => setAgenciaForm(emptyAgencia())}
              >
                Cancelar
              </Button>
            )}
          </div>
        </section>
      </PermissionGate>

      <section className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <h2 className="mb-4 font-semibold">Agencias</h2>
        <PaginatedDataTable
          data={agenciasData?.agencias.agencias ?? []}
          columns={agenciaColumns}
          pagination={agenciasData?.agencias}
          isLoading={loadingAgencias}
          emptyMessage="Sin agencias. Cree una o importe cartera."
          onPageChange={agenciasPagination.handlePageChange}
          onPageSizeChange={agenciasPagination.handlePageSizeChange}
          itemLabel="agencias"
        />
      </section>

      <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
        <section className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 font-semibold">
            {rutaForm.idruta ? 'Editar ruta' : 'Nueva ruta'}
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              Agencia
              <select
                className="mt-1 block rounded border px-3 py-2"
                value={rutaForm.idagencia}
                onChange={(e) =>
                  setRutaForm((f) => ({
                    ...f,
                    idagencia: e.target.value ? Number(e.target.value) : '',
                  }))
                }
              >
                <option value="">Seleccione</option>
                {(agenciasData?.agencias.agencias ?? []).map((a) => (
                  <option key={a.idagencia} value={a.idagencia}>
                    {a.codigo} — {a.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Nombre
              <input
                className="mt-1 block rounded border px-3 py-2"
                value={rutaForm.nombre}
                onChange={(e) =>
                  setRutaForm((f) => ({ ...f, nombre: e.target.value }))
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rutaForm.estado}
                onChange={(e) =>
                  setRutaForm((f) => ({ ...f, estado: e.target.checked }))
                }
              />
              Activa
            </label>
            <Button
              onClick={() => {
                void guardarRuta();
              }}
            >
              Guardar
            </Button>
            {rutaForm.idruta && (
              <Button
                variant="outline"
                onClick={() => setRutaForm(emptyRuta())}
              >
                Cancelar
              </Button>
            )}
          </div>
        </section>
      </PermissionGate>

      <section className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <h2 className="mb-4 font-semibold">Rutas</h2>
        <select
          value={idagencia}
          onChange={(e) => {
            setIdagencia(e.target.value ? Number(e.target.value) : '');
            rutasPagination.resetPage();
          }}
          className="mb-4 rounded border px-3 py-2 text-sm"
        >
          <option value="">Todas las agencias</option>
          {(agenciasData?.agencias.agencias ?? []).map((a) => (
            <option key={a.idagencia} value={a.idagencia}>
              {a.nombre}
            </option>
          ))}
        </select>
        <PaginatedDataTable
          data={rutasData?.rutas.rutas ?? []}
          columns={rutaColumns}
          pagination={rutasData?.rutas}
          isLoading={loadingRutas}
          emptyMessage="Sin rutas registradas."
          onPageChange={rutasPagination.handlePageChange}
          onPageSizeChange={rutasPagination.handlePageSizeChange}
          itemLabel="rutas"
        />
      </section>
    </div>
  );
}
