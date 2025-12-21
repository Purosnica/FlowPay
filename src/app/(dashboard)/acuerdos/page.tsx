"use client";

import { useState } from "react";
import { useAcuerdos } from "@/hooks/use-acuerdos";
import { AdvancedTable } from "@/components/ui/advanced-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModalCrearAcuerdo } from "@/components/cobranza/modals/modal-crear-acuerdo";
import { usePermisos } from "@/hooks/use-permisos";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DateInput } from "@/components/ui/date-input";
import { Select } from "@/components/ui/select";

interface Acuerdo {
  idacuerdo: number;
  idprestamo: number;
  tipoAcuerdo: string;
  estado: string;
  montoAcordado: number;
  numeroCuotas: number;
  fechaInicio: string;
  fechaFin: string;
  prestamo: {
    idprestamo: number;
    codigo: string;
    cliente: {
      primer_nombres: string;
      primer_apellido: string;
    };
  };
  usuario?: {
    nombre: string;
  } | null;
}

const tipoAcuerdoLabels: Record<string, string> = {
  PROMESA_DE_PAGO: "Promesa de Pago",
  CONVENIO_PARCIAL: "Convenio Parcial",
  CONVENIO_TOTAL: "Convenio Total",
  REFINANCIAMIENTO: "Refinanciamiento",
  REESTRUCTURADO: "Reestructurado",
};

const estadoLabels: Record<string, string> = {
  ACTIVO: "Activo",
  VENCIDO: "Vencido",
  CUMPLIDO: "Cumplido",
  INCUMPLIDO: "Incumplido",
};

const estadoVariants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  ACTIVO: "success",
  VENCIDO: "danger",
  CUMPLIDO: "success",
  INCUMPLIDO: "danger",
};

export default function AcuerdosPage() {
  const router = useRouter();
  const { tienePermiso } = usePermisos();
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 10,
    fechaDesde: undefined as Date | undefined,
    fechaHasta: undefined as Date | undefined,
    tipoAcuerdo: undefined as string | undefined,
    estado: undefined as string | undefined,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrestamo, setSelectedPrestamo] = useState<number | null>(null);

  const { data, isLoading, refetch } = useAcuerdos(filters);

  const acuerdos = (data as { acuerdos?: { acuerdos?: any[]; total?: number } })?.acuerdos?.acuerdos || [];
  const total = (data as { acuerdos?: { acuerdos?: any[]; total?: number } })?.acuerdos?.total || 0;

  const columns: ColumnDef<Acuerdo>[] = [
    {
      accessorKey: "fechaInicio",
      header: "Fecha Inicio",
      cell: ({ row }) => {
        const fecha = new Date(row.original.fechaInicio);
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
      accessorKey: "tipoAcuerdo",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge variant="info">
          {tipoAcuerdoLabels[row.original.tipoAcuerdo] || row.original.tipoAcuerdo}
        </Badge>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={estadoVariants[row.original.estado] || "default"}>
          {estadoLabels[row.original.estado] || row.original.estado}
        </Badge>
      ),
    },
    {
      accessorKey: "montoAcordado",
      header: "Monto Acordado",
      cell: ({ row }) =>
        new Intl.NumberFormat("es-PY", {
          style: "currency",
          currency: "PYG",
        }).format(row.original.montoAcordado),
    },
    {
      accessorKey: "numeroCuotas",
      header: "Cuotas",
      cell: ({ row }) => row.original.numeroCuotas,
    },
    {
      accessorKey: "fechaFin",
      header: "Fecha Fin",
      cell: ({ row }) => {
        const fecha = new Date(row.original.fechaFin);
        return fecha.toLocaleDateString("es-PY");
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/acuerdos/${row.original.idacuerdo}`)}
          >
            Ver
          </Button>
        </div>
      ),
    },
  ];

  const canCreate = tienePermiso("CREAR_ACUERDO");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Acuerdos de Pago
        </h1>
        {canCreate && (
          <Button onClick={() => setIsModalOpen(true)}>
            Nuevo Acuerdo
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
              label="Tipo de Acuerdo"
              options={Object.entries(tipoAcuerdoLabels).map(([value, label]) => ({
                value,
                label,
              }))}
              placeholder="Todos"
              value={filters.tipoAcuerdo || ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  tipoAcuerdo: e.target.value || undefined,
                })
              }
            />
            <Select
              label="Estado"
              options={Object.entries(estadoLabels).map(([value, label]) => ({
                value,
                label,
              }))}
              placeholder="Todos"
              value={filters.estado || ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  estado: e.target.value || undefined,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Lista de Acuerdos ({total} {total === 1 ? "registro" : "registros"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdvancedTable
            data={acuerdos}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No se encontraron acuerdos"
          />
        </CardContent>
      </Card>

      {canCreate && (
        <ModalCrearAcuerdo
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

