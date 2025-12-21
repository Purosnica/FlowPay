"use client";

import { use, useState } from "react";
import { usePagosByPrestamo } from "@/hooks/use-pagos";
import { AdvancedTable } from "@/components/ui/advanced-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModalCrearPago } from "@/components/cobranza/modals/modal-crear-pago";
import { usePermisos } from "@/hooks/use-permisos";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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

export default function PrestamoCobrosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { tienePermiso } = usePermisos();
  const idprestamo = parseInt(id);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, refetch } = usePagosByPrestamo(idprestamo);

  const pagos = (data as { pagosPorPrestamo?: any[] })?.pagosPorPrestamo || [];

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "fechaPago",
      header: "Fecha",
      cell: ({ row }) => {
        const fecha = new Date(row.original.fechaPago);
        return fecha.toLocaleDateString("es-PY");
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
      accessorKey: "montoCapital",
      header: "Capital",
      cell: ({ row }) =>
        new Intl.NumberFormat("es-PY", {
          style: "currency",
          currency: "PYG",
        }).format(Number(row.original.montoCapital)),
    },
    {
      accessorKey: "montoInteres",
      header: "Interés",
      cell: ({ row }) =>
        new Intl.NumberFormat("es-PY", {
          style: "currency",
          currency: "PYG",
        }).format(Number(row.original.montoInteres)),
    },
    {
      accessorKey: "montoMora",
      header: "Mora",
      cell: ({ row }) =>
        new Intl.NumberFormat("es-PY", {
          style: "currency",
          currency: "PYG",
        }).format(Number(row.original.montoMora)),
    },
    {
      accessorKey: "montoTotal",
      header: "Total",
      cell: ({ row }) =>
        new Intl.NumberFormat("es-PY", {
          style: "currency",
          currency: "PYG",
        }).format(Number(row.original.montoTotal)),
    },
    {
      accessorKey: "cuota",
      header: "Cuota",
      cell: ({ row }) =>
        row.original.cuota ? `Cuota ${row.original.cuota.numero}` : "-",
    },
    {
      accessorKey: "acuerdo",
      header: "Acuerdo",
      cell: ({ row }) =>
        row.original.acuerdo ? (
          <Badge variant="info">{row.original.acuerdo.tipoAcuerdo}</Badge>
        ) : (
          "-"
        ),
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

  const totalRecaudado = pagos.reduce(
    (sum, pago) => sum + Number(pago.montoTotal),
    0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" onClick={() => router.back()}>
            ← Volver
          </Button>
          <h1 className="mt-4 text-2xl font-bold text-dark dark:text-white">
            Cobros del Préstamo #{idprestamo}
          </h1>
        </div>
        {canCreate && (
          <Button onClick={() => setIsModalOpen(true)}>
            Registrar Pago
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total de Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-dark dark:text-white">
              {pagos.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Recaudado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat("es-PY", {
                style: "currency",
                currency: "PYG",
              }).format(totalRecaudado)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Promedio por Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-dark dark:text-white">
              {pagos.length > 0
                ? new Intl.NumberFormat("es-PY", {
                    style: "currency",
                    currency: "PYG",
                  }).format(totalRecaudado / pagos.length)
                : "0"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Lista de Cobros ({pagos.length} {pagos.length === 1 ? "registro" : "registros"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdvancedTable
            data={pagos}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No se encontraron cobros para este préstamo"
          />
        </CardContent>
      </Card>

      {canCreate && (
        <ModalCrearPago
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          idprestamo={idprestamo}
          onSuccess={() => {
            refetch();
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

