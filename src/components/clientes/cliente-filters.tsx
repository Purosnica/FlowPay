"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import {
  GET_TIPOS_DOCUMENTO,
  GET_GENEROS,
  GET_ESTADOS_CIVILES,
  GET_OCUPACIONES,
  GET_TIPOS_PERSONA,
  GET_PAISES,
  GET_DEPARTAMENTOS,
} from "@/lib/graphql/queries/cliente.queries";
import type { ClienteFilters } from "@/types/cliente";

interface ClienteFiltersProps {
  filters: ClienteFilters;
  onFiltersChange: (filters: ClienteFilters) => void;
  onReset: () => void;
}

export function ClienteFiltersComponent({
  filters,
  onFiltersChange,
  onReset,
}: ClienteFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<ClienteFilters>(filters);

  // Cargar catálogos
  const { data: tiposDocumento } = useGraphQLQuery<{
    tiposDocumento: Array<{ idtipodocumento: number; descripcion: string }>;
  }>(GET_TIPOS_DOCUMENTO, { estado: true });

  const { data: generos } = useGraphQLQuery<{
    generos: Array<{ idgenero: number; descripcion: string }>;
  }>(GET_GENEROS, { estado: true });

  const { data: estadosCiviles } = useGraphQLQuery<{
    estadosCiviles: Array<{ idestadocivil: number; descripcion: string }>;
  }>(GET_ESTADOS_CIVILES, { estado: true });

  const { data: ocupaciones } = useGraphQLQuery<{
    ocupaciones: Array<{ idocupacion: number; descripcion: string }>;
  }>(GET_OCUPACIONES, { estado: true });

  const { data: tiposPersona } = useGraphQLQuery<{
    tiposPersona: Array<{ idtipopersona: number; descripcion: string }>;
  }>(GET_TIPOS_PERSONA, { estado: true });

  const { data: paises } = useGraphQLQuery<{
    paises: Array<{ idpais: number; descripcion: string }>;
  }>(GET_PAISES, { estado: true });

  const { data: departamentos } = useGraphQLQuery<{
    departamentos: Array<{ iddepartamento: number; descripcion: string }>;
  }>(GET_DEPARTAMENTOS, {
    idpais: localFilters.idpais,
    estado: true,
  });

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    setLocalFilters({});
    onReset();
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-4">
          <Input
            placeholder="Buscar por nombre, documento, email..."
            value={localFilters.search || ""}
            onChange={(e) =>
              setLocalFilters({ ...localFilters, search: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleApply();
              }
            }}
            className="max-w-md"
          />
          <Button onClick={handleApply}>Buscar</Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={handleReset}>
              Limpiar
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Ocultar" : "Mostrar"} Filtros
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Tipo de Documento"
            placeholder="Todos"
            value={localFilters.idtipodocumento?.toString() || ""}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                idtipodocumento: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            options={
              tiposDocumento?.tiposDocumento?.map((t) => ({
                value: t.idtipodocumento,
                label: t.descripcion,
              })) || []
            }
          />

          <Select
            label="Género"
            placeholder="Todos"
            value={localFilters.idgenero?.toString() || ""}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                idgenero: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            options={
              generos?.generos?.map((g) => ({
                value: g.idgenero,
                label: g.descripcion,
              })) || []
            }
          />

          <Select
            label="Estado Civil"
            placeholder="Todos"
            value={localFilters.idestadocivil?.toString() || ""}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                idestadocivil: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            options={
              estadosCiviles?.estadosCiviles?.map((e) => ({
                value: e.idestadocivil,
                label: e.descripcion,
              })) || []
            }
          />

          <Select
            label="Ocupación"
            placeholder="Todos"
            value={localFilters.idocupacion?.toString() || ""}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                idocupacion: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            options={
              ocupaciones?.ocupaciones?.map((o) => ({
                value: o.idocupacion,
                label: o.descripcion,
              })) || []
            }
          />

          <Select
            label="Tipo de Persona"
            placeholder="Todos"
            value={localFilters.idtipopersona?.toString() || ""}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                idtipopersona: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            options={
              tiposPersona?.tiposPersona?.map((t) => ({
                value: t.idtipopersona,
                label: t.descripcion,
              })) || []
            }
          />

          <Select
            label="País"
            placeholder="Todos"
            value={localFilters.idpais?.toString() || ""}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                idpais: e.target.value ? Number(e.target.value) : undefined,
                iddepartamento: undefined, // Reset departamento cuando cambia país
              })
            }
            options={
              paises?.paises?.map((p) => ({
                value: p.idpais,
                label: p.descripcion,
              })) || []
            }
          />

          {localFilters.idpais && (
            <Select
              label="Departamento"
              placeholder="Todos"
              value={localFilters.iddepartamento?.toString() || ""}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  iddepartamento: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              options={
                departamentos?.departamentos?.map((d) => ({
                  value: d.iddepartamento,
                  label: d.descripcion,
                })) || []
              }
            />
          )}

          <Select
            label="Estado"
            placeholder="Todos"
            value={
              localFilters.estado === undefined
                ? ""
                : localFilters.estado
                ? "1"
                : "0"
            }
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                estado:
                  e.target.value === ""
                    ? undefined
                    : e.target.value === "1",
              })
            }
            options={[
              { value: "1", label: "Activo" },
              { value: "0", label: "Inactivo" },
            ]}
          />
        </div>
      )}
    </div>
  );
}




