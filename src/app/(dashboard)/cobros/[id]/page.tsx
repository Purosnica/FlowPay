"use client";

import { use } from "react";
import { usePago } from "@/hooks/use-pagos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

export default function CobroDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const idpago = parseInt(id);

  const { data, isLoading, error } = usePago(idpago);
  const pago = (data as { pago?: any })?.pago;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !pago) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          ← Volver
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600 dark:text-red-400">
              No se pudo cargar el pago o no existe.
            </p>
          </CardContent>
        </Card>
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
            Detalle del Pago #{pago.idpago}
          </h1>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="prestamo">Préstamo</TabsTrigger>
          {pago.cuota && <TabsTrigger value="cuota">Cuota</TabsTrigger>}
          {pago.acuerdo && <TabsTrigger value="acuerdo">Acuerdo</TabsTrigger>}
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Información del Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Fecha de Pago
                  </label>
                  <p className="text-dark dark:text-white">
                    {new Date(pago.fechaPago).toLocaleString("es-PY")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Método de Pago
                  </label>
                  <p>
                    <Badge variant="info">
                      {metodoPagoLabels[pago.metodoPago] || pago.metodoPago}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Tipo de Cobro
                  </label>
                  <p>
                    <Badge variant="secondary">
                      {tipoCobroLabels[pago.tipoCobro] || pago.tipoCobro}
                    </Badge>
                  </p>
                </div>
                {pago.referencia && (
                  <div>
                    <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Referencia
                    </label>
                    <p className="text-dark dark:text-white">{pago.referencia}</p>
                  </div>
                )}
                {pago.usuario && (
                  <div>
                    <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Registrado por
                    </label>
                    <p className="text-dark dark:text-white">
                      {pago.usuario.nombre} ({pago.usuario.email})
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Montos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Capital
                  </label>
                  <p className="text-lg font-semibold text-dark dark:text-white">
                    {new Intl.NumberFormat("es-PY", {
                      style: "currency",
                      currency: "PYG",
                    }).format(Number(pago.montoCapital))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Interés
                  </label>
                  <p className="text-lg font-semibold text-dark dark:text-white">
                    {new Intl.NumberFormat("es-PY", {
                      style: "currency",
                      currency: "PYG",
                    }).format(Number(pago.montoInteres))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Mora
                  </label>
                  <p className="text-lg font-semibold text-dark dark:text-white">
                    {new Intl.NumberFormat("es-PY", {
                      style: "currency",
                      currency: "PYG",
                    }).format(Number(pago.montoMora))}
                  </p>
                </div>
                <div className="border-t border-stroke pt-4 dark:border-dark-3">
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Total
                  </label>
                  <p className="text-2xl font-bold text-primary">
                    {new Intl.NumberFormat("es-PY", {
                      style: "currency",
                      currency: "PYG",
                    }).format(Number(pago.montoTotal))}
                  </p>
                </div>
              </CardContent>
            </Card>

            {(pago.observacion || pago.notas) && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Observaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  {pago.observacion && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                        Observación
                      </label>
                      <p className="text-dark dark:text-white">{pago.observacion}</p>
                    </div>
                  )}
                  {pago.notas && (
                    <div>
                      <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                        Notas
                      </label>
                      <p className="text-dark dark:text-white">{pago.notas}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="prestamo">
          {pago.prestamo && (
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
                      onClick={() => router.push(`/prestamos/${pago.prestamo.idprestamo}`)}
                      className="text-primary hover:underline"
                    >
                      {pago.prestamo.codigo}
                    </button>
                  </p>
                </div>
                {pago.prestamo.cliente && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                        Cliente
                      </label>
                      <p className="text-dark dark:text-white">
                        {pago.prestamo.cliente.primer_nombres}{" "}
                        {pago.prestamo.cliente.segundo_nombres}{" "}
                        {pago.prestamo.cliente.primer_apellido}{" "}
                        {pago.prestamo.cliente.segundo_apellido}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                        Documento
                      </label>
                      <p className="text-dark dark:text-white">
                        {pago.prestamo.cliente.numerodocumento}
                      </p>
                    </div>
                  </>
                )}
                {pago.prestamo.saldoTotal !== null && (
                  <div>
                    <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Saldo Total del Préstamo
                    </label>
                    <p className="text-lg font-semibold text-dark dark:text-white">
                      {new Intl.NumberFormat("es-PY", {
                        style: "currency",
                        currency: "PYG",
                      }).format(Number(pago.prestamo.saldoTotal))}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {pago.cuota && (
          <TabsContent value="cuota">
            <Card>
              <CardHeader>
                <CardTitle>Información de la Cuota</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Número de Cuota
                  </label>
                  <p className="text-dark dark:text-white">{pago.cuota.numero}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Fecha de Vencimiento
                  </label>
                  <p className="text-dark dark:text-white">
                    {new Date(pago.cuota.fechaVencimiento).toLocaleDateString("es-PY")}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Capital Programado
                    </label>
                    <p className="text-dark dark:text-white">
                      {new Intl.NumberFormat("es-PY", {
                        style: "currency",
                        currency: "PYG",
                      }).format(Number(pago.cuota.capitalProgramado))}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Capital Pagado
                    </label>
                    <p className="text-dark dark:text-white">
                      {new Intl.NumberFormat("es-PY", {
                        style: "currency",
                        currency: "PYG",
                      }).format(Number(pago.cuota.capitalPagado))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {pago.acuerdo && (
          <TabsContent value="acuerdo">
            <Card>
              <CardHeader>
                <CardTitle>Información del Acuerdo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Tipo de Acuerdo
                  </label>
                  <p className="text-dark dark:text-white">{pago.acuerdo.tipoAcuerdo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Monto Acordado
                  </label>
                  <p className="text-dark dark:text-white">
                    {new Intl.NumberFormat("es-PY", {
                      style: "currency",
                      currency: "PYG",
                    }).format(Number(pago.acuerdo.montoAcordado))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Fecha de Fin
                  </label>
                  <p className="text-dark dark:text-white">
                    {new Date(pago.acuerdo.fechaFin).toLocaleDateString("es-PY")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

