"use client";

import { use } from "react";
import { useGestion } from "@/hooks/use-gestiones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const tipoGestionLabels: Record<string, string> = {
  LLAMADA: "Llamada",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  VISITA: "Visita",
  CORREO: "Correo",
  OTRO: "Otro",
};

const canalLabels: Record<string, string> = {
  OFICINA: "Oficina",
  CAMPO: "Campo",
  CALL_CENTER: "Call Center",
  DIGITAL: "Digital",
  AGENTE_EXTERNO: "Agente Externo",
  ALIADO: "Aliado",
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

export default function GestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const idgestion = parseInt(id);

  const { data, isLoading, error } = useGestion(idgestion);
  const gestion = (data as { gestionCobro?: any })?.gestionCobro;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !gestion) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          ← Volver
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600 dark:text-red-400">
              No se pudo cargar la gestión o no existe.
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
            Detalle de la Gestión #{gestion.idgestion}
          </h1>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="prestamo">Préstamo</TabsTrigger>
          {gestion.cuota && <TabsTrigger value="cuota">Cuota</TabsTrigger>}
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Información de la Gestión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Fecha de Gestión
                  </label>
                  <p className="text-dark dark:text-white">
                    {new Date(gestion.fechaGestion).toLocaleString("es-PY")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Tipo de Gestión
                  </label>
                  <p>
                    <Badge variant="info">
                      {tipoGestionLabels[gestion.tipoGestion] || gestion.tipoGestion}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Canal
                  </label>
                  <p>
                    <Badge variant="secondary">
                      {canalLabels[gestion.canal] || gestion.canal}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Estado
                  </label>
                  <p>
                    <Badge variant={estadoVariants[gestion.estado] || "default"}>
                      {estadoLabels[gestion.estado] || gestion.estado}
                    </Badge>
                  </p>
                </div>
                {gestion.proximaAccion && (
                  <div>
                    <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Próxima Acción
                    </label>
                    <p className="text-dark dark:text-white">
                      {new Date(gestion.proximaAccion).toLocaleString("es-PY")}
                    </p>
                  </div>
                )}
                {gestion.duracionLlamada && (
                  <div>
                    <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Duración (minutos)
                    </label>
                    <p className="text-dark dark:text-white">
                      {gestion.duracionLlamada} minutos
                    </p>
                  </div>
                )}
                {gestion.usuario && (
                  <div>
                    <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Registrado por
                    </label>
                    <p className="text-dark dark:text-white">
                      {gestion.usuario.nombre} ({gestion.usuario.email})
                    </p>
                  </div>
                )}
                {gestion.resultado && (
                  <div>
                    <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                      Resultado
                    </label>
                    <p className="text-dark dark:text-white">
                      {gestion.resultado.descripcion}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {(gestion.resumen || gestion.notas) && (
              <Card>
                <CardHeader>
                  <CardTitle>Detalles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {gestion.resumen && (
                    <div>
                      <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                        Resumen
                      </label>
                      <p className="text-dark dark:text-white whitespace-pre-wrap">
                        {gestion.resumen}
                      </p>
                    </div>
                  )}
                  {gestion.notas && (
                    <div>
                      <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                        Notas
                      </label>
                      <p className="text-dark dark:text-white whitespace-pre-wrap">
                        {gestion.notas}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="prestamo">
          {gestion.prestamo && (
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
                      onClick={() => router.push(`/prestamos/${gestion.prestamo.idprestamo}`)}
                      className="text-primary hover:underline"
                    >
                      {gestion.prestamo.codigo}
                    </button>
                  </p>
                </div>
                {gestion.prestamo.cliente && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                        Cliente
                      </label>
                      <p className="text-dark dark:text-white">
                        {gestion.prestamo.cliente.primer_nombres}{" "}
                        {gestion.prestamo.cliente.segundo_nombres}{" "}
                        {gestion.prestamo.cliente.primer_apellido}{" "}
                        {gestion.prestamo.cliente.segundo_apellido}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                        Documento
                      </label>
                      <p className="text-dark dark:text-white">
                        {gestion.prestamo.cliente.numerodocumento}
                      </p>
                    </div>
                    {gestion.prestamo.cliente.telefono && (
                      <div>
                        <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                          Teléfono
                        </label>
                        <p className="text-dark dark:text-white">
                          {gestion.prestamo.cliente.telefono}
                        </p>
                      </div>
                    )}
                    {gestion.prestamo.cliente.celular && (
                      <div>
                        <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                          Celular
                        </label>
                        <p className="text-dark dark:text-white">
                          {gestion.prestamo.cliente.celular}
                        </p>
                      </div>
                    )}
                    {gestion.prestamo.cliente.email && (
                      <div>
                        <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                          Email
                        </label>
                        <p className="text-dark dark:text-white">
                          {gestion.prestamo.cliente.email}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {gestion.cuota && (
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
                  <p className="text-dark dark:text-white">{gestion.cuota.numero}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Fecha de Vencimiento
                  </label>
                  <p className="text-dark dark:text-white">
                    {new Date(gestion.cuota.fechaVencimiento).toLocaleDateString("es-PY")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-6 dark:text-dark-6">
                    Estado
                  </label>
                  <p className="text-dark dark:text-white">{gestion.cuota.estado}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

