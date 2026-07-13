'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { EditRowButton } from '@/components/ui/row-action-buttons';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import {
  MandanteForm,
  type MandanteFormData,
} from '@/components/cobranza/mandante-form';
import { ComisionCobroPanel } from '@/components/cobranza/comision-cobro-panel';
import { PoliticaDescuentoPanel } from '@/components/cobranza/politica-descuento-panel';
import { HorarioCobranzaPanel } from '@/components/cobranza/horario-cobranza-panel';
import { ContratoMandantePanel } from '@/components/cobranza/contrato-mandante-panel';
import { TipificacionMandantePanel } from '@/components/cobranza/tipificacion-mandante-panel';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_MANDANTES,
  CREATE_MANDANTE,
  UPDATE_MANDANTE,
  GET_USUARIOS_ACTIVOS,
  GET_USUARIOS_MANDANTE,
  ASIGNAR_USUARIO_MANDANTE,
  DESASIGNAR_USUARIO_MANDANTE,
  ACTUALIZAR_COMISION_USUARIO_MANDANTE,
} from '@/lib/graphql/queries/cobranza.queries';
import { usePagination } from '@/hooks/use-pagination';
import type { Mandante, UsuarioBasico, UsuarioMandanteAsignado } from '@/types/cobranza';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';

export default function MandantesPage() {
  const queryClient = useQueryClient();
  const {
    queryVars,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination();
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [comisionModal, setComisionModal] = useState(false);
  const [politicaModal, setPoliticaModal] = useState(false);
  const [horarioModal, setHorarioModal] = useState(false);
  const [contratoModal, setContratoModal] = useState(false);
  const [tipificacionModal, setTipificacionModal] = useState(false);
  const [selected, setSelected] = useState<Mandante | undefined>();
  const [assignMandante, setAssignMandante] = useState<Mandante | undefined>();
  const [comisionMandante, setComisionMandante] = useState<
    Mandante | undefined
  >();
  const [politicaMandante, setPoliticaMandante] = useState<
    Mandante | undefined
  >();
  const [horarioMandante, setHorarioMandante] = useState<
    Mandante | undefined
  >();
  const [contratoMandante, setContratoMandante] = useState<
    Mandante | undefined
  >();
  const [tipificacionMandante, setTipificacionMandante] = useState<
    Mandante | undefined
  >();
  const [usuarioAsignar, setUsuarioAsignar] = useState<number | ''>('');

  const { data, isLoading, error } = useGraphQLQuery<{
    mandantes: {
      mandantes: Mandante[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_MANDANTES, queryVars);

  const mandantesData = data?.mandantes;

  const { data: usuariosData } = useGraphQLQuery<{
    usuariosActivos: UsuarioBasico[];
  }>(GET_USUARIOS_ACTIVOS);

  const { data: asignadosData, refetch: refetchAsignados } =
    useGraphQLQuery<{ usuariosMandante: UsuarioMandanteAsignado[] }>(
      GET_USUARIOS_MANDANTE,
      { idmandante: assignMandante?.idmandante ?? 0 },
      { enabled: !!assignMandante },
    );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [GET_MANDANTES] });
  };

  const createMutation = useGraphQLMutation(CREATE_MANDANTE, {
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setSelected(undefined);
    },
  });

  const updateMutation = useGraphQLMutation(UPDATE_MANDANTE, {
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setSelected(undefined);
    },
  });

  const assignMutation = useGraphQLMutation(ASIGNAR_USUARIO_MANDANTE, {
    onSuccess: () => {
      refetchAsignados();
      setUsuarioAsignar('');
    },
  });

  const unassignMutation = useGraphQLMutation(DESASIGNAR_USUARIO_MANDANTE, {
    onSuccess: () => refetchAsignados(),
  });

  const comisionMutation = useGraphQLMutation(
    ACTUALIZAR_COMISION_USUARIO_MANDANTE,
    { onSuccess: () => refetchAsignados() },
  );

  const columns = useMemo<ColumnDef<Mandante>[]>(
    () => [
      { accessorKey: 'codigo', header: 'Código' },
      { accessorKey: 'nombre', header: 'Nombre' },
      {
        accessorKey: 'regulador',
        header: 'Regulador',
        cell: ({ row }) => row.original.regulador ?? '-',
      },
      {
        accessorKey: 'descuentoMaximo',
        header: 'Desc. máx. (%)',
        cell: ({ row }) => `${Number(row.original.descuentoMaximo)}%`,
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              row.original.estado
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30'
            }`}
          >
            {row.original.estado ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
    ],
    [],
  );

  const handleSubmit = (form: MandanteFormData) => {
    if (selected) {
      updateMutation.mutate({
        input: {
          idmandante: selected.idmandante,
          nombre: form.nombre,
          ruc: form.ruc || undefined,
          regulador: form.regulador,
          descuentoMaximo: form.descuentoMaximo,
          estado: form.estado,
        },
      });
    } else {
      createMutation.mutate({ input: form });
    }
  };

  const asignadosIds = new Set(
    (asignadosData?.usuariosMandante ?? []).map((u) => u.idusuario),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mandantes"
        description="Acreedores / clientes de la agencia"
        actions={
          <PermissionGate permiso={PERMISO.MANDANTE_WRITE}>
            <Button
              onClick={() => {
                setSelected(undefined);
                setModalOpen(true);
              }}
            >
              Nuevo mandante
            </Button>
          </PermissionGate>
        }
      />

      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-800 dark:bg-red-900/20">
            {error.message}
          </div>
        )}
        <PaginatedDataTable
          data={mandantesData?.mandantes ?? []}
          columns={columns}
          pagination={mandantesData}
          isLoading={isLoading}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          itemLabel="mandantes"
          rowActions={(m) => (
            <div className="flex justify-end gap-2">
              <Link href={`/cobranza/mandantes/${m.idmandante}`}>
                <Button size="sm">Gestionar</Button>
              </Link>
              <PermissionGate permiso={PERMISO.MANDANTE_WRITE}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTipificacionMandante(m);
                    setTipificacionModal(true);
                  }}
                >
                  Tipificación
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setContratoMandante(m);
                    setContratoModal(true);
                  }}
                >
                  Contratos
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setHorarioMandante(m);
                    setHorarioModal(true);
                  }}
                >
                  Horarios
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPoliticaMandante(m);
                    setPoliticaModal(true);
                  }}
                >
                  Políticas
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setComisionMandante(m);
                    setComisionModal(true);
                  }}
                >
                  Recuperación
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAssignMandante(m);
                    setAssignModal(true);
                  }}
                >
                  Usuarios
                </Button>
                <EditRowButton
                  onClick={() => {
                    setSelected(m);
                    setModalOpen(true);
                  }}
                />
              </PermissionGate>
            </div>
          )}
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelected(undefined);
        }}
        title={selected ? 'Editar mandante' : 'Nuevo mandante'}
        size="lg"
      >
        <MandanteForm
          mandante={selected}
          onSubmit={handleSubmit}
          onCancel={() => {
            setModalOpen(false);
            setSelected(undefined);
          }}
          isLoading={
            createMutation.isPending || updateMutation.isPending
          }
        />
      </Modal>

      <Modal
        isOpen={tipificacionModal}
        onClose={() => {
          setTipificacionModal(false);
          setTipificacionMandante(undefined);
        }}
        title={`Tipificación — ${tipificacionMandante?.nombre ?? ''}`}
        size="lg"
      >
        {tipificacionMandante && (
          <TipificacionMandantePanel mandante={tipificacionMandante} />
        )}
      </Modal>

      <Modal
        isOpen={contratoModal}
        onClose={() => {
          setContratoModal(false);
          setContratoMandante(undefined);
        }}
        title={`Contratos — ${contratoMandante?.nombre ?? ''}`}
        size="lg"
      >
        {contratoMandante && (
          <ContratoMandantePanel mandante={contratoMandante} />
        )}
      </Modal>

      <Modal
        isOpen={horarioModal}
        onClose={() => {
          setHorarioModal(false);
          setHorarioMandante(undefined);
        }}
        title={`Horarios de cobranza — ${horarioMandante?.nombre ?? ''}`}
        size="lg"
      >
        {horarioMandante && (
          <HorarioCobranzaPanel mandante={horarioMandante} />
        )}
      </Modal>

      <Modal
        isOpen={politicaModal}
        onClose={() => {
          setPoliticaModal(false);
          setPoliticaMandante(undefined);
        }}
        title={`Políticas de descuento — ${politicaMandante?.nombre ?? ''}`}
        size="lg"
      >
        {politicaMandante && (
          <PoliticaDescuentoPanel mandante={politicaMandante} />
        )}
      </Modal>

      <Modal
        isOpen={comisionModal}
        onClose={() => {
          setComisionModal(false);
          setComisionMandante(undefined);
        }}
        title={`Recuperación empresa — ${comisionMandante?.nombre ?? ''}`}
        size="lg"
      >
        {comisionMandante && (
          <ComisionCobroPanel
            mandante={comisionMandante}
            onClose={() => {
              setComisionModal(false);
              setComisionMandante(undefined);
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={assignModal}
        onClose={() => {
          setAssignModal(false);
          setAssignMandante(undefined);
        }}
        title={`Usuarios y comisiones — ${assignMandante?.nombre ?? ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-6">
            Configure el % de comisión por cobrador para este mandante. Si deja
            vacío el campo, se usa el % global del usuario (
            {`Configuración → Usuarios`}).
          </p>
          <div className="flex gap-2">
            <select
              value={usuarioAsignar}
              onChange={(e) =>
                setUsuarioAsignar(
                  e.target.value ? Number(e.target.value) : '',
                )
              }
              className="flex-1 rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            >
              <option value="">Seleccionar usuario...</option>
              {(usuariosData?.usuariosActivos ?? [])
                .filter((u) => !asignadosIds.has(u.idusuario))
                .map((u) => (
                  <option key={u.idusuario} value={u.idusuario}>
                    {u.nombre} ({u.email})
                  </option>
                ))}
            </select>
            <Button
              disabled={!usuarioAsignar || assignMutation.isPending}
              onClick={() => {
                if (assignMandante && usuarioAsignar) {
                  assignMutation.mutate({
                    idusuario: usuarioAsignar,
                    idmandante: assignMandante.idmandante,
                  });
                }
              }}
            >
              Asignar
            </Button>
          </div>
          <ul className="divide-y dark:divide-dark-3">
            {(asignadosData?.usuariosMandante ?? []).map((u) => (
              <li
                key={u.idusuario}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{u.nombre}</p>
                  <p className="text-xs text-gray-6">{u.email}</p>
                  <p className="text-xs text-gray-6">
                    Efectivo: {Number(u.porcentajeComision)}% · Global:{' '}
                    {Number(u.porcentajeComisionUsuario)}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder={`${Number(u.porcentajeComisionUsuario)}`}
                    title="Vacío = usar % global del usuario"
                    defaultValue={
                      u.porcentajeComisionMandante !== null
                        ? Number(u.porcentajeComisionMandante)
                        : ''
                    }
                    key={`${u.idusuario}-${u.porcentajeComisionMandante ?? 'default'}`}
                    className="w-24 rounded-lg border border-stroke px-2 py-1 text-sm dark:border-dark-3 dark:bg-dark-2"
                    onBlur={(e) => {
                      if (!assignMandante) {
                        return;
                      }
                      const raw = e.target.value.trim();
                      const porcentajeComision =
                        raw === '' ? null : Number(raw);
                      if (
                        porcentajeComision !== null &&
                        (Number.isNaN(porcentajeComision) ||
                          porcentajeComision < 0 ||
                          porcentajeComision > 100)
                      ) {
                        return;
                      }
                      const actual =
                        u.porcentajeComisionMandante !== null
                          ? Number(u.porcentajeComisionMandante)
                          : null;
                      if (porcentajeComision === actual) {
                        return;
                      }
                      comisionMutation.mutate({
                        input: {
                          idusuario: u.idusuario,
                          idmandante: assignMandante.idmandante,
                          porcentajeComision,
                        },
                      });
                    }}
                  />
                  <span className="text-xs text-gray-6">%</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={unassignMutation.isPending}
                    onClick={() =>
                      assignMandante &&
                      unassignMutation.mutate({
                        idusuario: u.idusuario,
                        idmandante: assignMandante.idmandante,
                      })
                    }
                  >
                    Quitar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
