"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ClienteTable } from "@/components/clientes/cliente-table";
import { TablePagination } from "@/components/cobranza/data-table";
import { usePagination } from "@/hooks/use-pagination";
import { ClienteFiltersComponent } from "@/components/clientes/cliente-filters";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import { useGraphQLMutation } from "@/hooks/use-graphql-mutation";
import { useQueryClient } from "@tanstack/react-query";
import {
  GET_CLIENTES,
  CREATE_CLIENTE,
  UPDATE_CLIENTE,
  DELETE_CLIENTE,
} from "@/lib/graphql/queries/cliente.queries";
import type {
  Cliente,
  ClienteFilters,
  CreateClienteInput,
  UpdateClienteInput,
} from "@/types/cliente";
import type { ColumnDef } from "@tanstack/react-table";

export default function ClientesPage() {
  const {
    resetPage,
    handlePageChange,
    handlePageSizeChange,
    queryVars,
  } = usePagination({ initialPageSize: 10 });
  const [filters, setFilters] = useState<ClienteFilters>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | undefined>();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<number | null>(null);

  const queryClient = useQueryClient();

  // Query para obtener clientes
  const { data, isLoading, error } = useGraphQLQuery<{
    clientes: {
      clientes: Cliente[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_CLIENTES, {
    ...queryVars,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });

  // Mutations
  const createMutation = useGraphQLMutation(CREATE_CLIENTE, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_CLIENTES] });
      setIsModalOpen(false);
      setSelectedCliente(undefined);
    },
  });

  const updateMutation = useGraphQLMutation(UPDATE_CLIENTE, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_CLIENTES] });
      setIsModalOpen(false);
      setSelectedCliente(undefined);
    },
  });

  const deleteMutation = useGraphQLMutation(DELETE_CLIENTE, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_CLIENTES] });
      setIsDeleteModalOpen(false);
      setClienteToDelete(null);
    },
  });

  // Definir columnas de la tabla
  const columns = useMemo<ColumnDef<Cliente>[]>(
    () => [
      {
        accessorKey: "numerodocumento",
        header: "Documento",
        cell: (info) => info.getValue() as string,
      },
      {
        accessorFn: (row) =>
          `${row.primer_nombres} ${row.segundo_nombres || ""} ${row.primer_apellido} ${row.segundo_apellido || ""}`.trim(),
        header: "Nombre Completo",
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: "tipodocumento.descripcion",
        header: "Tipo Doc.",
        cell: (info) => {
          const cliente = info.row.original;
          return cliente.tipodocumento?.descripcion || "-";
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: (info) => (info.getValue() as string) || "-",
      },
      {
        accessorKey: "telefono",
        header: "Teléfono",
        cell: (info) => (info.getValue() as string) || "-",
      },
      {
        accessorKey: "celular",
        header: "Celular",
        cell: (info) => (info.getValue() as string) || "-",
      },
      {
        accessorKey: "pais.descripcion",
        header: "País",
        cell: (info) => {
          const cliente = info.row.original;
          return cliente.pais?.descripcion || "-";
        },
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: (info) => {
          const estado = info.getValue() as boolean;
          return (
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                estado
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
            >
              {estado ? "Activo" : "Inactivo"}
            </span>
          );
        },
      },
      {
        id: "vista360",
        header: "360°",
        cell: ({ row }) => (
          <Link
            href={`/clientes/${row.original.idcliente}`}
            className="text-sm text-primary hover:underline"
          >
            Ver
          </Link>
        ),
      },
    ],
    []
  );

  const handleCreate = () => {
    setSelectedCliente(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setClienteToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (clienteToDelete) {
      deleteMutation.mutate({ id: clienteToDelete });
    }
  };

  const handleSubmit = (data: CreateClienteInput | UpdateClienteInput) => {
    if ("idcliente" in data) {
      // Update
      updateMutation.mutate({ input: data as UpdateClienteInput });
    } else {
      // Create
      createMutation.mutate({ input: data as CreateClienteInput });
    }
  };

  const handleFiltersChange = (newFilters: ClienteFilters) => {
    setFilters(newFilters);
    resetPage();
  };

  const handleResetFilters = () => {
    setFilters({});
    resetPage();
  };

  const clientesData = data?.clientes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Gestión de Clientes
        </h1>
        <Button onClick={handleCreate}>Nuevo Cliente</Button>
      </div>

      <ClienteFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200">
            Error al cargar clientes: {error.message}
          </div>
        )}

        <ClienteTable
          data={clientesData?.clientes || []}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />

        {clientesData && clientesData.total > 0 && (
          <TablePagination
            page={clientesData.page}
            pageSize={clientesData.pageSize}
            total={clientesData.total}
            totalPages={clientesData.totalPages}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            itemLabel="clientes"
          />
        )}
      </div>

      {/* Modal de formulario */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCliente(undefined);
        }}
        title={selectedCliente ? "Editar Cliente" : "Nuevo Cliente"}
        size="xl"
      >
        <ClienteForm
          cliente={selectedCliente}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false);
            setSelectedCliente(undefined);
          }}
          isLoading={
            createMutation.isPending || updateMutation.isPending
          }
        />
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setClienteToDelete(null);
        }}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-dark dark:text-white">
            ¿Estás seguro de que deseas eliminar este cliente? Esta acción no se
            puede deshacer.
          </p>
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setClienteToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

