"use client";

import { useState } from "react";
import { usePagos } from "@/hooks/use-pagos";
import { AdvancedTable } from "@/components/ui/advanced-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModalCrearPago } from "@/components/cobranza/modals/modal-crear-pago";
import { usePermisos } from "@/hooks/use-permisos";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DateInput } from "@/components/ui/date-input";
import { Select } from "@/components/ui/select";

interface Pago {
  idpago: number;
  idprestamo: number;
  metodoPago: string;
  tipoCobro: string;
  fechaPago: string;
  referencia?: string | null;
  montoCapital: number;
  montoInteres: number;
  montoMora: number;
  montoTotal: number;
  prestamo: {
    idprestamo: number;
    codigo: string;
    cliente: {
      primer_nombres: string;
      primer_apellido: string;
      numerodocumento: string;
    };
  };
  usuario?: {
    nombre: string;
  } | null;
}

const metodoPagoLabels: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  DEPOSITO: "Depósito",
  TARJETA: "Tarjeta",
  DEBITO_AUTOMATICO: "Débito Automático",
  CHEQUE: "Cheque",
  BILLETERA: "Billetera",
  DIGITAL: "Digital",
  JUDICIAL: "Judicial",
  EMBARGOS: "Embargos",
  ORDEN_JUDICIAL: "Orden Judicial",
};

const tipoCobroLabels: Record<string, string> = {
  PARCIAL: "Parcial",
  TOTAL: "Total",
  DESCUENTO: "Descuento",
  NEGOCIADO: "Negociado",
  EXTRAJUDICIAL: "Extrajudicial",
};

export default function CobrosPage() {
  const router = useRouter();
  const { tienePermiso } = usePermisos();
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 10,
    fechaDesde: undefined as Date | undefined,
    fechaHasta: undefined as Date | undefined,
    metodoPago: undefined as string | undefined,
    tipoCobro: undefined as string | undefined,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrestamo, setSelectedPrestamo] = useState<number | null>(null);

  const { data, isLoading, refetch } = usePagos(filters);

  const pagos = (data as { pagos?: { pagos?: any[]; total?: number } })?.pagos?.pagos || [];
  const total = (data as { pagos?: { pagos?: any[]; total?: number } })?.pagos?.total || 0;

  const columns: ColumnDef<Pago>[] = [
    {
      accessorKey: "fechaPago",
      header: "Fecha",
      cell: ({ row }) => {
        const fecha = new Date(row.original.fechaPago);
        return fecha.toLocaleDateString("es-PY");
      },
    },
    {
      accessorKey: "prestamo.codigo",
      header: "Préstamo",
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/prestamos/${row.original.idprestamo}`)}
          className="text-primary hover:underline"
        >
          {row.original.prestamo.codigo}
        </button>
      ),
    },
    {
      accessorKey: "prestamo.cliente",
      header: "Cliente",
      cell: ({ row }) => {
        const cliente = row.original.prestamo.cliente;
        return `${cliente.primer_nombres} ${cliente.primer_apellido}`;
      },
    },
    {
      accessorKey: "metodoPago",
      header: "Método",
      cell: ({ row }) => (
        <Badge variant="info">
          {metodoPagoLabels[row.original.metodoPago] || row.original.metodoPago}
        </Badge>
      ),
    },
    {
      accessorKey: "tipoCobro",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {tipoCobroLabels[row.original.tipoCobro] || row.original.tipoCobro}
        </Badge>
      ),
    },
    {
      accessorKey: "montoTotal",
      header: "Monto Total",
      cell: ({ row }) =>
        new Intl.NumberFormat("es-PY", {
          style: "currency",
          currency: "PYG",
        }).format(row.original.montoTotal),
    },
    {
      accessorKey: "usuario",
      header: "Registrado por",
      cell: ({ row }) => row.original.usuario?.nombre || "-",
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/cobros/${row.original.idpago}`)}
          >
            Ver
          </Button>
        </div>
      ),
    },
  ];

  const canCreate = tienePermiso("COBRAR") || tienePermiso("APPLY_PAYMENT");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Cobros
        </h1>
        {canCreate && (
          <Button onClick={() => setIsModalOpen(true)}>
            Registrar Pago
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <DateInput
              label="Fecha Desde"
              value={filters.fechaDesde}
              onChange={(date) =>
                setFilters({ ...filters, fechaDesde: date || undefined })
              }
            />
            <DateInput
              label="Fecha Hasta"
              value={filters.fechaHasta}
              onChange={(date) =>
                setFilters({ ...filters, fechaHasta: date || undefined })
              }
            />
            <Select
              label="Método de Pago"
              options={Object.entries(metodoPagoLabels).map(([value, label]) => ({
                value,
                label,
              }))}
              placeholder="Todos"
              value={filters.metodoPago || ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  metodoPago: e.target.value || undefined,
                })
              }
            />
            <Select
              label="Tipo de Cobro"
              options={Object.entries(tipoCobroLabels).map(([value, label]) => ({
                value,
                label,
              }))}
              placeholder="Todos"
              value={filters.tipoCobro || ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  tipoCobro: e.target.value || undefined,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Lista de Cobros ({total} {total === 1 ? "registro" : "registros"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdvancedTable
            data={pagos}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No se encontraron cobros"
          />
        </CardContent>
      </Card>

      {canCreate && (
        <ModalCrearPago
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPrestamo(null);
          }}
          idprestamo={selectedPrestamo || 0}
          onSuccess={() => {
            refetch();
            setIsModalOpen(false);
            setSelectedPrestamo(null);
          }}
        />
      )}
    </div>
  );
}

