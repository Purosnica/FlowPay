"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import { useGraphQLMutation } from "@/hooks/use-graphql-mutation";
import { LIST_CARTERA, ASIGNAR_GESTOR } from "@/lib/graphql/queries/finanzas.queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";

type CarteraItem = {
  prestamo: {
    idprestamo: number;
    codigo: string;
    referencia?: string | null;
    estado: string;
    tipoprestamo: string;
    montoSolicitado: number;
    montoAprobado?: number | null;
    montoDesembolsado?: number | null;
    fechaSolicitud: string;
    fechaVencimiento?: string | null;
    cliente: {
      idcliente: number;
      primer_nombres: string;
      primer_apellido: string;
      numerodocumento: string;
    };
    usuarioGestor?: {
      idusuario: number;
      nombre: string;
      email: string;
    } | null;
  };
  diasAtraso: number;
  saldoPendiente: number;
  cuotaVencida?: {
    idcuota: number;
    numero: number;
    fechaVencimiento: string;
    estado: string;
    diasMoraAcumulados: number;
  } | null;
  nivelRiesgo: string;
};

type CarteraResponse = {
  cartera: {
    items: CarteraItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const NivelRiesgoBadge: React.FC<{ nivel: string }> = ({ nivel }) => {
  const colorMap: Record<string, string> = {
    BAJO: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    MEDIO: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    ALTO: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    CRITICO: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  const color = colorMap[nivel] || "bg-gray-100 text-gray-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {nivel}
    </span>
  );
};

const DiasAtrasoBadge: React.FC<{ dias: number }> = ({ dias }) => {
  if (dias === 0) return <span className="text-green-600 dark:text-green-400">Al día</span>;
  const color =
    dias <= 30
      ? "text-yellow-600 dark:text-yellow-400"
      : dias <= 60
      ? "text-orange-600 dark:text-orange-400"
      : "text-red-600 dark:text-red-400";
  return <span className={`font-semibold ${color}`}>{dias} días</span>;
};

export function CarteraList() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [filters, setFilters] = useState<{
    tipo?: string;
    tipoprestamo?: string;
    idusuarioGestor?: number;
    diasAtrasoMin?: number;
    diasAtrasoMax?: number;
    montoMin?: number;
    montoMax?: number;
    search?: string;
  }>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [asignarGestorOpen, setAsignarGestorOpen] = useState(false);
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState<number | null>(null);
  const [gestorSeleccionado, setGestorSeleccionado] = useState<number | null>(null);

  const { data, isLoading, isError, error, refetch } = useGraphQLQuery<CarteraResponse>(
    LIST_CARTERA,
    { filters: { page, pageSize, ...filters } as any },
    { placeholderData: (previousData) => previousData }
  );

  const asignarGestorMutation = useGraphQLMutation(ASIGNAR_GESTOR, {
    onSuccess: () => {
      setAsignarGestorOpen(false);
      setPrestamoSeleccionado(null);
      setGestorSeleccionado(null);
      refetch();
    },
  });

  const items = data?.cartera?.items || [];
  const totalPages = data?.cartera?.totalPages || 1;

  const handleFilterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPage(1);
    setFilters({
      tipo: (formData.get("tipo") as string) || undefined,
      tipoprestamo: (formData.get("tipoprestamo") as string) || undefined,
      diasAtrasoMin: formData.get("diasAtrasoMin")
        ? parseInt(formData.get("diasAtrasoMin") as string)
        : undefined,
      diasAtrasoMax: formData.get("diasAtrasoMax")
        ? parseInt(formData.get("diasAtrasoMax") as string)
        : undefined,
      montoMin: formData.get("montoMin")
        ? parseFloat(formData.get("montoMin") as string)
        : undefined,
      montoMax: formData.get("montoMax")
        ? parseFloat(formData.get("montoMax") as string)
        : undefined,
      search: (formData.get("search") as string) || undefined,
    });
  };

  const handleAsignarGestor = () => {
    if (!prestamoSeleccionado) return;
    asignarGestorMutation.mutate({
      idprestamo: prestamoSeleccionado,
      idusuarioGestor: gestorSeleccionado || null,
    });
  };

  const columns = useMemo<ColumnDef<CarteraItem>[]>(
    () => [
      {
        accessorKey: "prestamo.codigo",
        header: "Código",
        cell: ({ row }) => (
          <span className="font-medium text-dark dark:text-white">
            {row.original.prestamo.codigo}
          </span>
        ),
      },
      {
        accessorKey: "prestamo.cliente",
        header: "Cliente",
        cell: ({ row }) => {
          const cliente = row.original.prestamo.cliente;
          return (
            <div className="flex flex-col">
              <span className="text-dark dark:text-white">
                {cliente.primer_nombres} {cliente.primer_apellido}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {cliente.numerodocumento}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "prestamo.tipoprestamo",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.prestamo.tipoprestamo}
          </span>
        ),
      },
      {
        accessorKey: "diasAtraso",
        header: "Días Atraso",
        cell: ({ row }) => <DiasAtrasoBadge dias={row.original.diasAtraso} />,
      },
      {
        accessorKey: "nivelRiesgo",
        header: "Nivel Riesgo",
        cell: ({ row }) => <NivelRiesgoBadge nivel={row.original.nivelRiesgo} />,
      },
      {
        accessorKey: "saldoPendiente",
        header: "Saldo Pendiente",
        cell: ({ row }) => (
          <span className="font-semibold text-dark dark:text-white">
            {row.original.saldoPendiente.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        accessorKey: "prestamo.montoDesembolsado",
        header: "Monto Desembolsado",
        cell: ({ row }) => {
          const monto = row.original.prestamo.montoDesembolsado || 0;
          return (
            <span className="text-gray-700 dark:text-gray-300">
              {monto.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          );
        },
      },
      {
        accessorKey: "prestamo.usuarioGestor",
        header: "Gestor",
        cell: ({ row }) => {
          const gestor = row.original.prestamo.usuarioGestor;
          return gestor ? (
            <span className="text-gray-700 dark:text-gray-300">{gestor.nombre}</span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">Sin asignar</span>
          );
        },
      },
      {
        id: "acciones",
        header: "Acciones",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPrestamoSeleccionado(row.original.prestamo.idprestamo);
              setGestorSeleccionado(row.original.prestamo.usuarioGestor?.idusuario || null);
              setAsignarGestorOpen(true);
            }}
          >
            Asignar Gestor
          </Button>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-dark dark:text-white">Cartera</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Gestión y seguimiento de cartera de préstamos
          </p>
        </div>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-stroke bg-white p-3 shadow-sm dark:border-dark-3 dark:bg-dark-2"
      >
        <div className="w-full md:w-1/4">
          <Select
            name="tipo"
            label="Tipo de Cartera"
            options={[
              { value: "activa", label: "Activa" },
              { value: "mora", label: "En Mora" },
              { value: "castigada", label: "Castigada" },
            ]}
            placeholder="Todos"
            defaultValue=""
          />
        </div>
        <div className="w-full md:w-1/4">
          <Select
            name="tipoprestamo"
            label="Tipo Préstamo"
            options={[
              { value: "PROPIO", label: "Propio" },
              { value: "TERCERIZADO", label: "Tercerizado" },
            ]}
            placeholder="Todos"
            defaultValue=""
          />
        </div>
        <div className="w-full md:w-1/6">
          <Input
            name="diasAtrasoMin"
            label="Días Mín."
            type="number"
            placeholder="0"
            defaultValue=""
          />
        </div>
        <div className="w-full md:w-1/6">
          <Input
            name="diasAtrasoMax"
            label="Días Máx."
            type="number"
            placeholder="999"
            defaultValue=""
          />
        </div>
        <div className="w-full md:w-1/6">
          <Input
            name="montoMin"
            label="Monto Mín."
            type="number"
            step="0.01"
            placeholder="0"
            defaultValue=""
          />
        </div>
        <div className="w-full md:w-1/6">
          <Input
            name="montoMax"
            label="Monto Máx."
            type="number"
            step="0.01"
            placeholder="999999"
            defaultValue=""
          />
        </div>
        <div className="w-full md:w-1/3">
          <Input
            name="search"
            label="Buscar"
            placeholder="Código o referencia"
            defaultValue=""
          />
        </div>
        <Button type="submit" size="sm">
          Filtrar
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-dark-2">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        )}

        {isError && (
          <div className="px-4 py-4 text-center text-red-500">
            Error al cargar cartera: {error instanceof Error ? error.message : "desconocido"}
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="px-4 py-12 text-center text-gray-600 dark:text-gray-300">
            No se encontraron préstamos en cartera.
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-3 text-sm">
            <thead className="bg-gray-50 dark:bg-dark-3">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? "cursor-pointer select-none hover:text-primary"
                              : ""
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: " ↑",
                            desc: " ↓",
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-3">
              {table.getRowModel().rows.map((row) => {
                const nivelRiesgo = row.original.nivelRiesgo;
                const bgColor =
                  nivelRiesgo === "CRITICO"
                    ? "bg-red-50 dark:bg-red-900/20"
                    : nivelRiesgo === "ALTO"
                    ? "bg-orange-50 dark:bg-orange-900/20"
                    : nivelRiesgo === "MEDIO"
                    ? "bg-yellow-50 dark:bg-yellow-900/20"
                    : "bg-white dark:bg-dark-2";

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-gray-50 dark:hover:bg-dark-3/60 ${bgColor}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-2 text-gray-700 dark:text-gray-200"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && !isError && items.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-200">
          <span>
            Página {page} de {totalPages} ({data?.cartera?.total || 0} registros)
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={asignarGestorOpen}
        onClose={() => {
          setAsignarGestorOpen(false);
          setPrestamoSeleccionado(null);
          setGestorSeleccionado(null);
        }}
        title="Asignar Gestor"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Selecciona un gestor para asignar a este préstamo. Deja vacío para quitar la asignación.
          </p>
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Gestor
            </label>
            <Input
              type="number"
              placeholder="ID del gestor (por ahora manual)"
              value={gestorSeleccionado?.toString() || ""}
              onChange={(e) =>
                setGestorSeleccionado(
                  e.target.value ? parseInt(e.target.value) : null
                )
              }
            />
            <p className="mt-1 text-xs text-gray-500">
              Nota: En una versión futura, esto será un selector de usuarios.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAsignarGestorOpen(false);
                setPrestamoSeleccionado(null);
                setGestorSeleccionado(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAsignarGestor}
              disabled={asignarGestorMutation.isPending}
            >
              {asignarGestorMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

