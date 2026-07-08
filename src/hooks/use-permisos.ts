'use client';

import { useAuth } from '@/contexts/auth-context';

export function usePermisos(): string[] {
  const { permisos } = useAuth();
  return permisos;
}

export function usePuede(permiso: string): boolean {
  const permisos = usePermisos();
  return permisos.includes(permiso);
}

export function usePuedeAlguno(permisosRequeridos: string[]): boolean {
  const permisos = usePermisos();
  return permisosRequeridos.some((p) => permisos.includes(p));
}
