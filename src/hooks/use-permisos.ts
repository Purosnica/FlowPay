"use client";

import { useState, useEffect } from "react";

// Este hook simula la verificación de permisos en el frontend
// En producción, deberías obtener los permisos del usuario autenticado
// desde el contexto de autenticación o desde una query GraphQL

export type PermisoCodigo =
  | "COBRAR"
  | "CREAR_GESTION"
  | "CREAR_ACUERDO"
  | "VER_CARTERA"
  | "VER_REPORTES"
  | "ADMIN_SISTEMA"
  | "ASIGNAR_CUENTAS"
  | "REGISTRAR_GESTIONES"
  | "CREAR_ACUERDO"
  | "EDITAR_ACUERDO"
  | "ELIMINAR_ACUERDO"
  | "APPLY_PAYMENT"
  | "EDIT_PAYMENT"
  | "DELETE_PAYMENT"
  | "VIEW_PAYMENT";

interface UsePermisosOptions {
  idusuario?: number | null;
}

export function usePermisos(options?: UsePermisosOptions) {
  const [permisos, setPermisos] = useState<PermisoCodigo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Obtener permisos reales del usuario desde el backend
    // Por ahora, retornamos todos los permisos para desarrollo
    // En producción, deberías hacer una query GraphQL para obtener los permisos del usuario
    
    // Simulación: todos los permisos habilitados
    const todosLosPermisos: PermisoCodigo[] = [
      "COBRAR",
      "CREAR_GESTION",
      "CREAR_ACUERDO",
      "VER_CARTERA",
      "VER_REPORTES",
      "ADMIN_SISTEMA",
      "ASIGNAR_CUENTAS",
      "REGISTRAR_GESTIONES",
      "EDITAR_ACUERDO",
      "ELIMINAR_ACUERDO",
      "APPLY_PAYMENT",
      "EDIT_PAYMENT",
      "DELETE_PAYMENT",
      "VIEW_PAYMENT",
    ];

    setPermisos(todosLosPermisos);
    setLoading(false);
  }, [options?.idusuario]);

  const tienePermiso = (permiso: PermisoCodigo): boolean => {
    return permisos.includes(permiso);
  };

  const tieneAlgunPermiso = (permisosRequeridos: PermisoCodigo[]): boolean => {
    return permisosRequeridos.some((p) => tienePermiso(p));
  };

  const tieneTodosLosPermisos = (permisosRequeridos: PermisoCodigo[]): boolean => {
    return permisosRequeridos.every((p) => tienePermiso(p));
  };

  return {
    permisos,
    loading,
    tienePermiso,
    tieneAlgunPermiso,
    tieneTodosLosPermisos,
  };
}

