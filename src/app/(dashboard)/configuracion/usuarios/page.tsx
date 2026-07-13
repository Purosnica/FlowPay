'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { EditRowButton } from '@/components/ui/row-action-buttons';
import { Modal } from '@/components/ui/modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { TablePagination } from '@/components/cobranza/data-table';
import { usePagination } from '@/hooks/use-pagination';
import { UsuarioForm } from '@/components/admin/usuario-form';
import { RolPermisosPanel } from '@/components/admin/rol-permisos-panel';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { useAuth } from '@/contexts/auth-context';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  GET_USUARIOS,
  GET_ROLES,
  GET_ROLES_ACTIVOS,
  GET_PERMISOS_CATALOGO,
  GET_SUPERVISORES_ACTIVOS,
  CREATE_USUARIO,
  UPDATE_USUARIO,
  SET_USUARIO_ACTIVO,
  CREATE_ROL,
  UPDATE_ROL,
  SET_PERMISOS_ROL,
} from '@/lib/graphql/queries/admin.queries';
import type {
  PermisoCatalogo,
  RolFormData,
  RolGestion,
  UsuarioFormData,
  UsuarioGestion,
} from '@/types/admin';

export default function UsuariosAdminPage() {
  const queryClient = useQueryClient();
  const { permisos } = useAuth();
  const puedeEscribir = permisos.includes(PERMISO.USER_WRITE);
  const usuariosPagination = usePagination();
  const rolesPagination = usePagination();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<
    UsuarioGestion | undefined
  >();
  const [selectedRol, setSelectedRol] = useState<RolGestion | undefined>();

  const { data: usuariosData, isLoading: loadingUsuarios, error } =
    useGraphQLQuery<{
      usuarios: {
        usuarios: UsuarioGestion[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };
    }>(GET_USUARIOS, usuariosPagination.queryVars);

  const { data: rolesData, isLoading: loadingRoles } = useGraphQLQuery<{
    roles: {
      roles: RolGestion[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_ROLES, rolesPagination.queryVars);

  const { data: rolesActivosData } = useGraphQLQuery<{
    rolesActivos: RolGestion[];
  }>(GET_ROLES_ACTIVOS);

  const { data: permisosData } = useGraphQLQuery<{
    permisosCatalogo: PermisoCatalogo[];
  }>(GET_PERMISOS_CATALOGO);

  const { data: supervisoresData } = useGraphQLQuery<{
    supervisoresActivos: { idusuario: number; nombre: string }[];
  }>(GET_SUPERVISORES_ACTIVOS);

  const invalidateUsuarios = () => {
    queryClient.invalidateQueries({ queryKey: [GET_USUARIOS] });
  };

  const invalidateRoles = () => {
    queryClient.invalidateQueries({ queryKey: [GET_ROLES] });
    queryClient.invalidateQueries({ queryKey: [GET_ROLES_ACTIVOS] });
  };

  const createUsuarioMutation = useGraphQLMutation(CREATE_USUARIO, {
    onSuccess: () => {
      invalidateUsuarios();
      setModalOpen(false);
      setSelectedUsuario(undefined);
    },
  });

  const updateUsuarioMutation = useGraphQLMutation(UPDATE_USUARIO, {
    onSuccess: () => {
      invalidateUsuarios();
      setModalOpen(false);
      setSelectedUsuario(undefined);
    },
  });

  const toggleActivoMutation = useGraphQLMutation(SET_USUARIO_ACTIVO, {
    onSuccess: () => invalidateUsuarios(),
  });

  const createRolMutation = useGraphQLMutation(CREATE_ROL, {
    onSuccess: () => invalidateRoles(),
  });

  const updateRolMutation = useGraphQLMutation(UPDATE_ROL, {
    onSuccess: () => invalidateRoles(),
  });

  const setPermisosMutation = useGraphQLMutation(SET_PERMISOS_ROL, {
    onSuccess: () => invalidateRoles(),
  });

  const columns = useMemo<ColumnDef<UsuarioGestion>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Nombre' },
      { accessorKey: 'email', header: 'Email' },
      {
        id: 'rol',
        header: 'Rol',
        cell: ({ row }) => row.original.rol.codigo,
      },
      {
        id: 'comision',
        header: '% comisión',
        cell: ({ row }) => `${Number(row.original.porcentajeComision)}%`,
      },
      {
        accessorKey: 'activo',
        header: 'Estado',
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              row.original.activo
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {row.original.activo ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
      {
        accessorKey: 'ultimoAcceso',
        header: 'Último acceso',
        cell: ({ row }) =>
          row.original.ultimoAcceso
            ? new Date(row.original.ultimoAcceso).toLocaleString('es-NI')
            : '—',
      },
    ],
    [],
  );

  const handleUsuarioSubmit = (data: UsuarioFormData) => {
    if (selectedUsuario) {
      const input: Record<string, unknown> = {
        idusuario: selectedUsuario.idusuario,
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono || null,
        idrol: data.idrol,
        porcentajeComision: data.porcentajeComision,
        activo: data.activo,
        idsupervisor: data.idsupervisor ?? null,
      };
      if (data.password) {
        input.password = data.password;
      }
      updateUsuarioMutation.mutate({ input });
      return;
    }

    createUsuarioMutation.mutate({
      input: {
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono || undefined,
        idrol: data.idrol,
        password: data.password,
        porcentajeComision: data.porcentajeComision,
        activo: data.activo,
        idsupervisor: data.idsupervisor ?? null,
      },
    });
  };

  const usuariosPage = usuariosData?.usuarios;
  const rolesPage = rolesData?.roles;
  const roles = rolesPage?.roles ?? [];
  const rolesActivos = rolesActivosData?.rolesActivos ?? [];

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
          No tiene permisos para ver usuarios (USER_READ) o ocurrió un error al
          cargar los datos.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Usuarios y permisos
        </h1>
        <p className="mt-1 text-sm text-gray-6 dark:text-dark-6">
          Cree usuarios, asigne roles y configure los permisos de cada rol en el
          sistema.
        </p>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles y permisos</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <div className="mb-4 flex justify-end">
            {puedeEscribir && (
              <Button
                onClick={() => {
                  setSelectedUsuario(undefined);
                  setModalOpen(true);
                }}
              >
                Nuevo usuario
              </Button>
            )}
          </div>

          <PaginatedDataTable
            data={usuariosPage?.usuarios ?? []}
            columns={columns}
            pagination={usuariosPage}
            isLoading={loadingUsuarios}
            emptyMessage="No hay usuarios registrados"
            onPageChange={usuariosPagination.handlePageChange}
            onPageSizeChange={usuariosPagination.handlePageSizeChange}
            itemLabel="usuarios"
            rowActions={
              puedeEscribir
                ? (row) => (
                    <div className="flex gap-1">
                      <EditRowButton
                        onClick={() => {
                          setSelectedUsuario(row);
                          setModalOpen(true);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggleActivoMutation.mutate({
                            idusuario: row.idusuario,
                            activo: !row.activo,
                          })
                        }
                      >
                        {row.activo ? 'Desactivar' : 'Activar'}
                      </Button>
                    </div>
                  )
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          {loadingRoles ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <RolPermisosPanel
                roles={roles}
                permisos={permisosData?.permisosCatalogo ?? []}
                selectedRol={selectedRol}
                onSelectRol={setSelectedRol}
                onCreateRol={(data: RolFormData) =>
                  createRolMutation.mutate({ input: data })
                }
                onUpdateRol={(idrol, data) =>
                  updateRolMutation.mutate({ input: { idrol, ...data } })
                }
                onSavePermisos={(idrol, idpermisos) =>
                  setPermisosMutation.mutate({
                    input: { idrol, idpermisos },
                  })
                }
                isSaving={
                  createRolMutation.isPending ||
                  updateRolMutation.isPending ||
                  setPermisosMutation.isPending
                }
              />
              {rolesPage && (
                <TablePagination
                  page={rolesPage.page}
                  pageSize={rolesPage.pageSize}
                  total={rolesPage.total}
                  totalPages={rolesPage.totalPages}
                  isLoading={loadingRoles}
                  onPageChange={rolesPagination.handlePageChange}
                  onPageSizeChange={rolesPagination.handlePageSizeChange}
                  itemLabel="roles"
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedUsuario(undefined);
        }}
        title={selectedUsuario ? 'Editar usuario' : 'Nuevo usuario'}
      >
        <UsuarioForm
          initial={selectedUsuario}
          roles={rolesActivos}
          supervisores={supervisoresData?.supervisoresActivos ?? []}
          onSubmit={handleUsuarioSubmit}
          onCancel={() => {
            setModalOpen(false);
            setSelectedUsuario(undefined);
          }}
          isLoading={
            createUsuarioMutation.isPending || updateUsuarioMutation.isPending
          }
        />
      </Modal>
    </div>
  );
}
