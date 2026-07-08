'use client';

import { useAuth } from '@/contexts/auth-context';
import {
  esRolCobrador,
  esRolGerente,
  esRolSupervisor,
  type RolCodigo,
} from '@/lib/permissions/role-codes';

export function useRolCodigo(): string | null {
  const { usuario } = useAuth();
  return usuario?.rolCodigo ?? null;
}

export function useEsCobrador(): boolean {
  return esRolCobrador(useRolCodigo());
}

export function useEsGerente(): boolean {
  return esRolGerente(useRolCodigo());
}

export function useEsSupervisor(): boolean {
  return esRolSupervisor(useRolCodigo());
}

export function useEsRol(codigo: RolCodigo): boolean {
  return useRolCodigo() === codigo;
}
