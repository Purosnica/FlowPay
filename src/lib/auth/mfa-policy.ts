/**
 * Política MFA: roles privilegiados deben tener TOTP activo.
 */

import { esRolGerente } from '@/lib/permissions/role-codes';

export function rolRequiereMfa(codigo: string | null | undefined): boolean {
  return esRolGerente(codigo);
}

export function calcularMfaSetupRequired(
  rolCodigo: string | null | undefined,
  mfaEnabled: boolean,
): boolean {
  return rolRequiereMfa(rolCodigo) && !mfaEnabled;
}
