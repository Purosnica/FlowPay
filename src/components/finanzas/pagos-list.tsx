"use client";

import { useMemo, useState } from "react";
import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import {
  LIST_PAGOS_POR_PRESTAMO,
  LIST_PRESTAMOS_COMBO,
  LIST_CUOTAS_POR_PRESTAMO,
} from "@/lib/graphql/queries/finanzas.queries";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PagoCreateForm, PagoFormValues } from "./pago-create-form";

type PagoItem = {
  idpago: number;
  idprestamo: number;
  idcuota?: number | null;
  idusuario?: number | null;
  metodoPago: string;
  fechaPago: string;
  referencia?: string | null;
  montoCapital: number;
  montoInteres: number;
  montoMora: number;
  montoTotal: number;
  notas?: string | null;
};

type PagosResponse = {
  pagosPorPrestamo: {
    pagos: PagoItem[];
    total: number;
  };
};

export function PagosList() {
  const [idprestamo, setIdprestamo] = useState<number | undefined>(undefined);
  const [idcuota, setIdcuota] = useState<number | undefined>(undefined);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PagoFormValues | null>(null);

  const { data: prestamosData, isLoading: loadingPrestamos } = useGraphQLQuery<{
    prestamos: { prestamos: Array<{ idprestamo: number; codigo: string; idcliente: number }> };
  }>(LIST_PRESTAMOS_COMBO, { filters: { page: 1, pageSize: 50 } });

  const { data: cuotasData, isLoading: loadingCuotas } = useGraphQLQuery<{
    cuotasPorPrestamo: { cuotas: Array<{ idcuota: number; numero: number; estado: string }> };
  }>(LIST_CUOTAS_POR_PRESTAMO, { idprestamo }, { enabled: !!idprestamo });

  const { data, isLoading, isError, error, refetch } = useGraphQLQuery<PagosResponse>(
    LIST_PAGOS_POR_PRESTAMO,
    { idprestamo: idprestamo!, idcuota },
    { enabled: !!idprestamo }
  );

  const pagos = data?.pagosPorPrestamo?.pagos || [];

  const prestamoOptions =
    prestamosData?.prestamos?.prestamos?.map((p) => ({
      value: p.idprestamo,
      label: `Préstamo ${p.codigo} (Cliente ${p.idcliente})`,
    })) || [];

  const cuotaOptions =
    cuotasData?.cuotasPorPrestamo?.cuotas?.map((c) => ({
      value: c.idcuota,
      label: `Cuota #${c.numero} - ${c.estado}`,
    })) || [];

  const rows = useMemo(() => pagos, [pagos]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-dark dark:text-white">Pagos</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Pagos por préstamo/cuota.</p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} disabled={!idprestamo}>
          Registrar pago
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-stroke bg-white p-3 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <div className="w-full md:w-1/3">
          <Select
            name="prestamo"
            label="Préstamo"
            placeholder={loadingPrestamos ? "Cargando..." : "Seleccione un préstamo"}
            options={prestamoOptions}
            value={idprestamo || ""}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : undefined;
              setIdprestamo(val);
              setIdcuota(undefined);
            }}
          />
        </div>
        <div className="w-full md:w-1/4">
          <Select
            name="cuota"
            label="Cuota"
            placeholder={
              idprestamo
                ? loadingCuotas
                  ? "Cargando..."
                  : "Todas"
                : "Seleccione un préstamo"
            }
            disabled={!idprestamo}
            options={cuotaOptions}
            value={idcuota || ""}
            onChange={(e) => setIdcuota(e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-3 text-sm">
          <thead className="bg-gray-50 dark:bg-dark-3">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">ID</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Cuota</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Método</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Fecha</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Capital</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Interés</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Mora</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white">Total</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-3">
            {!idprestamo && (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center text-gray-600 dark:text-gray-300">
                  Seleccione un préstamo para ver los pagos.
                </td>
              </tr>
            )}
            {idprestamo && isLoading && (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center text-gray-600 dark:text-gray-300">
                  Cargando...
                </td>
              </tr>
            )}
            {idprestamo && isError && (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center text-red-500">
                  Error al cargar pagos: {error instanceof Error ? error.message : "desconocido"}
                </td>
              </tr>
            )}
            {idprestamo && !isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center text-gray-600 dark:text-gray-300">
                  No hay pagos registrados.
                </td>
              </tr>
            )}
            {idprestamo &&
              !isLoading &&
              !isError &&
              rows.map((p) => (
                <tr key={p.idpago} className="hover:bg-gray-50 dark:hover:bg-dark-3/60">
                  <td className="px-4 py-2 font-medium text-dark dark:text-white">{p.idpago}</td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {p.idcuota ? `#${p.idcuota}` : "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{p.metodoPago}</td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {new Date(p.fechaPago).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {p.montoCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {p.montoInteres.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {p.montoMora.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {p.montoTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditing({
                          ...p,
                          metodoPago: p.metodoPago as "EFECTIVO" | "TRANSFERENCIA" | "DEPOSITO" | "TARJETA" | "DEBITO_AUTOMATICO" | "CHEQUE" | "BILLETERA" | "DIGITAL",
                          fechaPago: p.fechaPago ? new Date(p.fechaPago as any) : undefined,
                        } as any)
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

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Registrar pago"
        size="xl"
      >
        <PagoCreateForm
          initialData={idprestamo ? { idprestamo, metodoPago: "EFECTIVO" as const, montoCapital: 0, montoInteres: 0, montoMora: 0 } : undefined}
          onSuccess={() => {
            setIsCreateOpen(false);
            refetch();
          }}
        />
      </Modal>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Editar pago"
        size="xl"
      >
        {editing && (
          <PagoCreateForm
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

