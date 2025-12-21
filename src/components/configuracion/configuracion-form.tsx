"use client";

import { useState, useEffect } from "react";
import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import { useGraphQLMutation } from "@/hooks/use-graphql-mutation";
import { LIST_CONFIGURACIONES, BULK_UPDATE_CONFIGURACION } from "@/lib/graphql/queries/finanzas.queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ConfiguracionItem = {
  idconfiguracion: number;
  clave: string;
  valor: string;
  tipo: string;
  descripcion?: string | null;
  categoria?: string | null;
  idusuarioMod?: number | null;
  updatedAt: string;
  usuarioMod?: {
    idusuario: number;
    nombre: string;
  } | null;
};

type ConfiguracionesResponse = {
  configuracionesSistema: ConfiguracionItem[];
};

interface ConfiguracionFormProps {
  idusuario?: number;
}

const categorias = [
  { value: "mora", label: "Mora" },
  { value: "cobranza", label: "Cobranza" },
  { value: "reestructuracion", label: "Reestructuración" },
  { value: "general", label: "General" },
];

export function ConfiguracionForm({ idusuario }: ConfiguracionFormProps) {
  const [configuraciones, setConfiguraciones] = useState<Record<string, string>>({});
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("");

  const { data, isLoading, isError, error, refetch } = useGraphQLQuery<ConfiguracionesResponse>(
    LIST_CONFIGURACIONES,
    { categoria: categoriaFiltro || undefined }
  );

  const updateMutation = useGraphQLMutation(BULK_UPDATE_CONFIGURACION, {
    onSuccess: () => {
      alert("Configuración actualizada exitosamente");
      refetch();
    },
    onError: (error: any) => {
      alert(`Error al actualizar: ${error.message || "Error desconocido"}`);
    },
  });

  // Inicializar valores cuando se cargan los datos
  useEffect(() => {
    if (data?.configuracionesSistema) {
      const valores: Record<string, string> = {};
      data.configuracionesSistema.forEach((config) => {
        valores[config.clave] = config.valor;
      });
      setConfiguraciones(valores);
    }
  }, [data]);

  const handleChange = (clave: string, valor: string) => {
    setConfiguraciones((prev) => ({
      ...prev,
      [clave]: valor,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convertir configuraciones a array
    const configuracionesArray = Object.entries(configuraciones).map(([clave, valor]) => ({
      clave,
      valor,
    }));

    updateMutation.mutate({
      input: {
        configuraciones: configuracionesArray,
        idusuarioMod: idusuario,
      },
    });
  };

  const handleReset = () => {
    if (data?.configuracionesSistema) {
      const valores: Record<string, string> = {};
      data.configuracionesSistema.forEach((config) => {
        valores[config.clave] = config.valor;
      });
      setConfiguraciones(valores);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-96 text-red-500">
        Error al cargar configuración: {error instanceof Error ? error.message : "desconocido"}
      </div>
    );
  }

  const configsPorCategoria = (data?.configuracionesSistema || []).reduce(
    (acc, config) => {
      const cat = config.categoria || "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(config);
      return acc;
    },
    {} as Record<string, ConfiguracionItem[]>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-dark dark:text-white">
            Configuración del Sistema
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Solo usuarios con rol ADMINISTRADOR pueden modificar estos parámetros
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleReset}>
            Restaurar
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      {/* Filtro por categoría */}
      <div className="flex gap-2">
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Configuraciones por categoría */}
      {Object.entries(configsPorCategoria).map(([categoria, configs]) => {
        const categoriaLabel = categorias.find((c) => c.value === categoria)?.label || categoria;

        return (
          <div
            key={categoria}
            className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2"
          >
            <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              {categoriaLabel}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {configs.map((config) => {
                const valorActual = configuraciones[config.clave] || config.valor;

                return (
                  <div key={config.clave} className="space-y-1">
                    <label className="block text-sm font-medium text-dark dark:text-white">
                      {config.clave.replace(/_/g, " ")}
                    </label>
                    {config.descripcion && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {config.descripcion}
                      </p>
                    )}
                    {config.tipo === "numero" || config.tipo === "decimal" ? (
                      <Input
                        type="number"
                        step={config.tipo === "decimal" ? "0.01" : "1"}
                        value={valorActual}
                        onChange={(e) => handleChange(config.clave, e.target.value)}
                        className="mt-1"
                      />
                    ) : config.clave.includes("HORARIO") ? (
                      <Input
                        type="time"
                        value={valorActual}
                        onChange={(e) => handleChange(config.clave, e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <Input
                        type="text"
                        value={valorActual}
                        onChange={(e) => handleChange(config.clave, e.target.value)}
                        className="mt-1"
                      />
                    )}
                    {config.updatedAt && (
                      <p className="text-xs text-gray-400">
                        Última modificación: {new Date(config.updatedAt).toLocaleString()}
                        {config.usuarioMod && ` por ${config.usuarioMod.nombre}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {Object.keys(configsPorCategoria).length === 0 && (
        <div className="rounded-lg border border-stroke bg-white p-6 text-center shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <p className="text-gray-600 dark:text-gray-300">
            No hay configuraciones disponibles
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={handleReset}>
          Restaurar
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </form>
  );
}




