"use client";

import { use } from "react";
import { useAcuerdo } from "@/hooks/use-acuerdos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdvancedTable } from "@/components/ui/advanced-table";
import { type ColumnDef } from "@tanstack/react-table";

interface AcuerdoPago {
  idpago: number;
  fechaPago: string;
  metodoPago: string;
  montoCapital: number;
  montoInteres: number;
  montoMora: number;
  montoTotal: number;
}

interface AcuerdoCliente {
  idcliente: number;
  primer_nombres: string;
  segundo_nombres: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  numerodocumento: string;
  telefono: string | null;
  celular: string | null;
  email: string | null;
}

interface AcuerdoPrestamo {
  idprestamo: number;
  codigo: string;
  montoDesembolsado: number | null;
  saldoTotal: number | null;
  cliente: AcuerdoCliente;
}

interface AcuerdoUsuario {
  idusuario: number;
  nombre: string;
  email: string;
}

interface AcuerdoData {
  idacuerdo: number;
  idprestamo: number;
  idusuario: number;
  tipoAcuerdo: string;
  estado: string;
  montoAcordado: number;
  numeroCuotas: number;
  fechasPagoProgramadas: string | null;
  fechaInicio: string;
  fechaFin: string;
  observacion: string | null;
  createdAt: string;
  updatedAt: string;
  prestamo: AcuerdoPrestamo;
  usuario: AcuerdoUsuario;
  pagos: AcuerdoPago[];
}

interface AcuerdoResponse {
  acuerdo: AcuerdoData;
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

export default function AcuerdoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const idacuerdo = parseInt(id);

  const { data, isLoading, error } = useAcuerdo(idacuerdo);
  const acuerdo = (data as AcuerdoResponse | undefined)?.acuerdo;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !acuerdo) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          ← Volver
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600 dark:text-red-400">
              No se pudo cargar el acuerdo o no existe.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fechasPagoProgramadas = acuerdo.fechasPagoProgramadas
    ? JSON.parse(acuerdo.fechasPagoProgramadas)
    : [];

  const pagosColumns: ColumnDef<AcuerdoPago>[] = [
    {
      accessorKey: "fechaPago",
      header: "Fecha",
      cell: ({ row }) =>
        new Date(row.original.fechaPago).toLocaleDateString("es-PY"),
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
      accessorKey: "montoTotal",
      header: "Monto Total",
      cell: ({ row }) =>
        new Intl.NumberFormat("es-PY", {
          style: "currency",
          currency: "PYG",
        }).format(Number(row.original.montoTotal)),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" onClick={() => router.back()}>
            ← Volver
          </Button>
          <h1 className="mt-4 text-2xl font-bold text-dark dark:text-white">
            Detalle del Acuerdo #{acuerdo.idacuerdo}
          </h1>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="prestamo">Préstamo</TabsTrigger>
          <TabsTrigger value="pagos">Pagos ({acuerdo.pagos?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Información del Acuerdo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Tipo de Acuerdo
                  </label>
                  <p>
                    <Badge variant="info">
                      {tipoAcuerdoLabels[acuerdo.tipoAcuerdo] || acuerdo.tipoAcuerdo}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Estado
                  </label>
                  <p>
                    <Badge variant={estadoVariants[acuerdo.estado] || "default"}>
                      {estadoLabels[acuerdo.estado] || acuerdo.estado}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Monto Acordado
                  </label>
                  <p className="text-lg font-semibold text-dark dark:text-white">
                    {new Intl.NumberFormat("es-PY", {
                      style: "currency",
                      currency: "PYG",
                    }).format(Number(acuerdo.montoAcordado))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Número de Cuotas
                  </label>
                  <p className="text-dark dark:text-white">{acuerdo.numeroCuotas}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Fecha de Inicio
                  </label>
                  <p className="text-dark dark:text-white">
                    {new Date(acuerdo.fechaInicio).toLocaleDateString("es-PY")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Fecha de Fin
                  </label>
                  <p className="text-dark dark:text-white">
                    {new Date(acuerdo.fechaFin).toLocaleDateString("es-PY")}
                  </p>
                </div>
                {acuerdo.usuario && (
                  <div>
                    <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Creado por
                    </label>
                    <p className="text-dark dark:text-white">
                      {acuerdo.usuario.nombre} ({acuerdo.usuario.email})
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {acuerdo.observacion && (
              <Card>
                <CardHeader>
                  <CardTitle>Observación</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-dark dark:text-white whitespace-pre-wrap">
                    {acuerdo.observacion}
                  </p>
                </CardContent>
              </Card>
            )}

            {fechasPagoProgramadas.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Fechas de Pago Programadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2">
                    {fechasPagoProgramadas.map((fecha: string, index: number) => (
                      <li key={index} className="text-dark dark:text-white">
                        {new Date(fecha).toLocaleDateString("es-PY")}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="prestamo">
          {acuerdo.prestamo && (
            <Card>
              <CardHeader>
                <CardTitle>Información del Préstamo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Código
                  </label>
                  <p className="text-dark dark:text-white">
                    <button
                      onClick={() => router.push(`/prestamos/${acuerdo.prestamo.idprestamo}`)}
                      className="text-primary hover:underline"
                    >
                      {acuerdo.prestamo.codigo}
                    </button>
                  </p>
                </div>
                {acuerdo.prestamo.cliente && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                        Cliente
                      </label>
                      <p className="text-dark dark:text-white">
                        {acuerdo.prestamo.cliente.primer_nombres}{" "}
                        {acuerdo.prestamo.cliente.segundo_nombres}{" "}
                        {acuerdo.prestamo.cliente.primer_apellido}{" "}
                        {acuerdo.prestamo.cliente.segundo_apellido}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                        Documento
                      </label>
                      <p className="text-dark dark:text-white">
                        {acuerdo.prestamo.cliente.numerodocumento}
                      </p>
                    </div>
                  </>
                )}
                {acuerdo.prestamo.saldoTotal !== null && (
                  <div>
                    <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Saldo Total del Préstamo
                    </label>
                    <p className="text-lg font-semibold text-dark dark:text-white">
                      {new Intl.NumberFormat("es-PY", {
                        style: "currency",
                        currency: "PYG",
                      }).format(Number(acuerdo.prestamo.saldoTotal))}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pagos">
          <Card>
            <CardHeader>
              <CardTitle>Pagos Relacionados</CardTitle>
            </CardHeader>
            <CardContent>
              {acuerdo.pagos && acuerdo.pagos.length > 0 ? (
                <AdvancedTable
                  data={acuerdo.pagos}
                  columns={pagosColumns}
                  emptyMessage="No hay pagos relacionados"
                />
              ) : (
                <p className="text-center text-gray-6 dark:text-dark-6 py-8">
                  No hay pagos relacionados con este acuerdo
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

