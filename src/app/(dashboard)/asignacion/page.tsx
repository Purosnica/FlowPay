"use client";

import { useState } from "react";
import { useAsignaciones } from "@/hooks/use-asignacion";
import { AdvancedTable } from "@/components/ui/advanced-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModalAsignarCobrador } from "@/components/cobranza/modals/modal-asignar-cobrador";
import { usePermisos } from "@/hooks/use-permisos";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Select } from "@/components/ui/select";
import { useCobradores } from "@/hooks/use-cobradores";
import { ModalConfirmacion } from "@/components/cobranza/modals/modal-confirmacion";
import { useDesasignarCartera } from "@/hooks/use-asignacion";
import { notificationToast } from "@/lib/notifications/notification-toast";

interface Asignacion {
  idasignacion: number;
  idprestamo: number;
  idusuario: number;
  fechaAsignacion: string;
  fechaFin?: string | null;
  motivo?: string | null;
  activa: boolean;
  prestamo: {
    idprestamo: number;
    codigo: string;
    estado: string;
    cliente: {
      primer_nombres: string;
      primer_apellido: string;
      numerodocumento: string;
    };
  };
  usuario: {
    idusuario: number;
    nombre: string;
    email: string;
  };
}

export default function AsignacionPage() {
  const router = useRouter();
  const { tienePermiso } = usePermisos();
  const { data: cobradoresData } = useCobradores();
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 10,
    idusuario: undefined as number | undefined,
    activa: true,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrestamo, setSelectedPrestamo] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    idasignacion: number | null;
  }>({ isOpen: false, idasignacion: null });

  const { data, isLoading, refetch } = useAsignaciones(filters);
  const desasignarMutation = useDesasignarCartera();

  const asignaciones = (data as { asignacionesCartera?: { asignaciones?: any[]; total?: number } })?.asignacionesCartera?.asignaciones || [];
  const total = (data as { asignacionesCartera?: { asignaciones?: any[]; total?: number } })?.asignacionesCartera?.total || 0;

  const cobradoresOptions =
    (cobradoresData as { usuarios?: any[] })?.usuarios?.map((c: any) => ({
      value: c.idusuario,
      label: `${c.nombre} (${c.email})`,
    })) || [];

  const columns: ColumnDef<Asignacion>[] = [
    {
      accessorKey: "fechaAsignacion",
      header: "Fecha Asignación",
      cell: ({ row }) => {
        const fecha = new Date(row.original.fechaAsignacion);
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
      accessorKey: "usuario",
      header: "Cobrador",
      cell: ({ row }) => (
        <div>
          <p className="text-dark dark:text-white">{row.original.usuario.nombre}</p>
          <p className="text-sm text-gray-6 dark:text-dark-6">
            {row.original.usuario.email}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "activa",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={row.original.activa ? "success" : "secondary"}>
          {row.original.activa ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      accessorKey: "fechaFin",
      header: "Fecha Fin",
      cell: ({ row }) =>
        row.original.fechaFin
          ? new Date(row.original.fechaFin).toLocaleDateString("es-PY")
          : "-",
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex gap-2">
          {row.original.activa && tienePermiso("ASIGNAR_CUENTAS") && (
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                setConfirmModal({ isOpen: true, idasignacion: row.original.idasignacion })
              }
            >
              Desasignar
            </Button>
          )}
        </div>
      ),
    },
  ];

  const canAssign = tienePermiso("ASIGNAR_CUENTAS");

  const handleDesasignar = async () => {
    if (!confirmModal.idasignacion) return;

    try {
      await desasignarMutation.mutateAsync({
        idasignacion: confirmModal.idasignacion,
        idusuario: undefined,
      });
      notificationToast.success("Cartera desasignada exitosamente");
      setConfirmModal({ isOpen: false, idasignacion: null });
      refetch();
    } catch (error: any) {
      notificationToast.error(error?.message || "Error al desasignar la cartera");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Asignación de Cartera
        </h1>
        {canAssign && (
          <Button onClick={() => setIsModalOpen(true)}>
            Asignar Cobrador
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Select
              label="Cobrador"
              options={cobradoresOptions}
              placeholder="Todos"
              value={filters.idusuario?.toString() || ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  idusuario: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            />
            <Select
              label="Estado"
              options={[
                { value: "true", label: "Activas" },
                { value: "false", label: "Inactivas" },
                { value: "", label: "Todas" },
              ]}
              value={filters.activa.toString()}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  activa: e.target.value === "true",
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Lista de Asignaciones ({total} {total === 1 ? "registro" : "registros"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdvancedTable
            data={asignaciones}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No se encontraron asignaciones"
          />
        </CardContent>
      </Card>

      {canAssign && (
        <ModalAsignarCobrador
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

      <ModalConfirmacion
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, idasignacion: null })}
        onConfirm={handleDesasignar}
        title="Desasignar Cartera"
        message="¿Está seguro de que desea desasignar esta cartera? Esta acción no se puede deshacer."
        confirmText="Desasignar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={desasignarMutation.isPending}
      />
    </div>
  );
}

