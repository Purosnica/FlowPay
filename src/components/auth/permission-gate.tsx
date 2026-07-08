'use client';

import type { ReactNode } from 'react';
import { usePuede, usePuedeAlguno } from '@/hooks/use-permisos';

interface PermissionGateProps {
  permiso?: string;
  permisos?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({
  permiso,
  permisos,
  children,
  fallback = null,
}: PermissionGateProps) {
  const puedeUno = usePuede(permiso ?? '');
  const puedeVarios = usePuedeAlguno(permisos ?? []);
  const allowed = permiso ? puedeUno : puedeVarios;

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
