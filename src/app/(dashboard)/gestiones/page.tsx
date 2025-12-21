"use client";

import { useState } from "react";
import { useGestiones } from "@/hooks/use-gestiones";
import { AdvancedTable } from "@/components/ui/advanced-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModalCrearGestion } from "@/components/cobranza/modals/modal-crear-gestion";
import { usePermisos } from "@/hooks/use-permisos";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DateInput } from "@/components/ui/date-input";
import { Select } from "@/components/ui/select";

interface Gestion {
  idgestion: number;
  idprestamo: number;
  tipoGestion: string;
  canal: string;
  estado: string;
  fechaGestion: string;
  proximaAccion?: string | null;
  resumen?: string | null;
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

const tipoGestionLabels: Record<string, string> = {
  LLAMADA: "Llamada",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  VISITA: "Visita",
  CORREO: "Correo",
  OTRO: "Otro",
};

const estadoLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONTACTADO: "Contactado",
  PROMESA: "Promesa",
  NO_CONTACTADO: "No Contactado",
  NO_INTERESADO: "No Interesado",
  ESCALADA: "Escalada",
  CERRADA: "Cerrada",
};

const estadoVariants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  PENDIENTE: "warning",
  CONTACTADO: "info",
  PROMESA: "success",
  NO_CONTACTADO: "danger",
  NO_INTERESADO: "danger",
  ESCALADA: "warning",
  CERRADA: "default",
};

export default function GestionesPage() {
  const router = useRouter();
  const { tienePermiso } = usePermisos();
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 10,
    fechaDesde: undefined as Date | undefined,
    fechaHasta: undefined as Date | undefined,
    tipoGestion: undefined as string | undefined,
    estado: undefined as string | undefined,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrestamo, setSelectedPrestamo] = useState<number | null>(null);

  const { data, isLoading, refetch } = useGestiones(filters);

  const gestiones = (data as { gestionesCobro?: { gestiones?: any[]; total?: number } })?.gestionesCobro?.gestiones || [];
  const total = (data as { gestionesCobro?: { gestiones?: any[]; total?: number } })?.gestionesCobro?.total || 0;

  const columns: ColumnDef<Gestion>[] = [
    {
      accessorKey: "fechaGestion",
      header: "Fecha",
      cell: ({ row }) => {
        const fecha = new Date(row.original.fechaGestion);
        return fecha.toLocaleDateString("es-PY", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
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
      accessorKey: "tipoGestion",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge variant="info">
          {tipoGestionLabels[row.original.tipoGestion] || row.original.tipoGestion}
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
      accessorKey: "proximaAccion",
      header: "Próxima Acción",
      cell: ({ row }) =>
        row.original.proximaAccion
          ? new Date(row.original.proximaAccion).toLocaleDateString("es-PY")
          : "-",
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
            onClick={() => router.push(`/gestiones/${row.original.idgestion}`)}
          >
            Ver
          </Button>
        </div>
      ),
    },
  ];

  const canCreate = tienePermiso("CREAR_GESTION") || tienePermiso("REGISTRAR_GESTIONES");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Gestiones de Cobranza
        </h1>
        {canCreate && (
          <Button onClick={() => setIsModalOpen(true)}>
            Nueva Gestión
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
              label="Tipo de Gestión"
              options={Object.entries(tipoGestionLabels).map(([value, label]) => ({
                value,
                label,
              }))}
              placeholder="Todos"
              value={filters.tipoGestion || ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  tipoGestion: e.target.value || undefined,
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
            Lista de Gestiones ({total} {total === 1 ? "registro" : "registros"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdvancedTable
            data={gestiones}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No se encontraron gestiones"
          />
        </CardContent>
      </Card>

      {canCreate && (
        <ModalCrearGestion
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

