"use client";

import { useMemo, useState } from "react";
import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import { LIST_PRESTAMOS } from "@/lib/graphql/queries/finanzas.queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { PrestamoCreateForm, PrestamoFormValues } from "./prestamo-create-form";

type PrestamoItem = {
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
};

type PrestamosResponse = {
  prestamos: {
    prestamos: PrestamoItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const EstadoBadge: React.FC<{ estado: string }> = ({ estado }) => {
  const color =
    estado === "APROBADO"
      ? "bg-green-100 text-green-800"
      : estado === "DESEMBOLSADO" || estado === "EN_CURSO"
      ? "bg-blue-100 text-blue-800"
      : estado === "EN_MORA"
      ? "bg-red-100 text-red-700"
      : estado === "PAGADO"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-gray-100 text-gray-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {estado}
    </span>
  );
};

export function PrestamosList() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [filters, setFilters] = useState<{ search?: string; estado?: string; tipoprestamo?: string }>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PrestamoFormValues | null>(null);

  const { data, isLoading, isError, error, refetch } = useGraphQLQuery<PrestamosResponse>(
    LIST_PRESTAMOS,
    { filters: { page, pageSize, ...filters } as any },
    { placeholderData: (previousData) => previousData }
  );

  const prestamos = data?.prestamos?.prestamos || [];
  const totalPages = data?.prestamos?.totalPages || 1;

  const rows = useMemo(
    () =>
      prestamos.map((p) => ({
        ...p,
        clienteNombre: `${p.cliente.primer_nombres} ${p.cliente.primer_apellido}`,
      })),
    [prestamos]
  );

  const handleFilterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPage(1);
    setFilters({
      search: (formData.get("search") as string) || undefined,
      estado: (formData.get("estado") as string) || undefined,
      tipoprestamo: (formData.get("tipoprestamo") as string) || undefined,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-dark dark:text-white">Préstamos</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Listado de préstamos creados.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          Crear préstamo
        </Button>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-stroke bg-white p-3 shadow-sm dark:border-dark-3 dark:bg-dark-2"
      >
        <div className="w-full md:w-1/3">
          <Input name="search" label="Buscar" placeholder="Código, referencia o cliente" />
        </div>
        <div className="w-full md:w-1/4">
          <Select
            name="estado"
            label="Estado"
            options={[
              { value: "BORRADOR", label: "Borrador" },
              { value: "APROBADO", label: "Aprobado" },
              { value: "DESEMBOLSADO", label: "Desembolsado" },
              { value: "EN_CURSO", label: "En curso" },
              { value: "EN_MORA", label: "En mora" },
              { value: "PAGADO", label: "Pagado" },
              { value: "REFINANCIADO", label: "Refinanciado" },
              { value: "CASTIGADO", label: "Castigado" },
              { value: "CANCELADO", label: "Cancelado" },
            ]}
            placeholder="Todos"
            defaultValue=""
          />
        </div>
        <div className="w-full md:w-1/4">
          <Select
            name="tipoprestamo"
            label="Tipo"
            options={[
              { value: "PROPIO", label: "Propio" },
              { value: "TERCERIZADO", label: "Tercerizado" },
            ]}
            placeholder="Todos"
            defaultValue=""
          />
        </div>
        <Button type="submit" size="sm">
          Filtrar
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-3 text-sm">
          <thead className="bg-gray-50 dark:bg-dark-3">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Código</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Cliente</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Tipo</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Estado</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Monto Sol.</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Monto Aprob.</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Desembolso</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Vencimiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-3">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-center text-gray-600 dark:text-gray-300">
                  Cargando...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-center text-red-500">
                  Error al cargar préstamos: {error instanceof Error ? error.message : "desconocido"}
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-center text-gray-600 dark:text-gray-300">
                  No hay préstamos registrados.
                </td>
              </tr>
            )}
            {!isLoading &&
              !isError &&
              rows.map((p) => (
                <tr key={p.idprestamo} className="hover:bg-gray-50 dark:hover:bg-dark-3/60">
                  <td className="px-4 py-2 font-medium text-dark dark:text-white">{p.codigo}</td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    <div className="flex flex-col">
                      <span>{p.clienteNombre}</span>
                      <span className="text-xs text-gray-500">{p.cliente.numerodocumento}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{p.tipoprestamo}</td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    <EstadoBadge estado={p.estado} />
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {p.montoSolicitado.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {p.montoAprobado != null
                      ? p.montoAprobado.toLocaleString(undefined, { minimumFractionDigits: 2 })
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {p.montoDesembolsado != null
                      ? p.montoDesembolsado.toLocaleString(undefined, { minimumFractionDigits: 2 })
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {p.fechaVencimiento
                      ? new Date(p.fechaVencimiento).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditing({
                          idprestamo: p.idprestamo,
                          idcliente: p.cliente.idcliente,
                          codigo: p.codigo,
                          referencia: p.referencia || undefined,
                          tipoprestamo: p.tipoprestamo as "PROPIO" | "TERCERIZADO",
                          montoSolicitado: p.montoSolicitado,
                          montoAprobado: p.montoAprobado || undefined,
                          montoDesembolsado: p.montoDesembolsado || undefined,
                          tasaInteresAnual: undefined,
                          plazoMeses: undefined,
                          fechaSolicitud: p.fechaSolicitud ? new Date(p.fechaSolicitud) : undefined,
                          fechaAprobacion: undefined,
                          fechaDesembolso: undefined,
                          fechaVencimiento: p.fechaVencimiento ? new Date(p.fechaVencimiento) : undefined,
                          observaciones: undefined,
                        })
                      }
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-200">
        <span>
          Página {page} de {totalPages}
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

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Crear préstamo" size="xl">
        <PrestamoCreateForm
          onSuccess={() => {
            setIsCreateOpen(false);
            refetch();
          }}
        />
      </Modal>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Editar préstamo"
        size="xl"
      >
        {editing && (
          <PrestamoCreateForm
            initialData={editing}
            onSuccess={() => {
              setEditing(null);
              refetch();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

