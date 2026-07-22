/**
 * Construye el claim mfaSetupRequired desde BD (rol + flag MFA).
 */

import { prisma } from '@/lib/prisma';
import { calcularMfaSetupRequired } from '@/lib/auth/mfa-policy';

export async function obtenerMfaSetupRequired(
  idusuario: number,
): Promise<boolean> {
  const usuario = await prisma.tbl_usuario.findFirst({
    where: { idusuario, activo: true, deletedAt: null },
    select: {
      mfaEnabled: true,
      rol: { select: { codigo: true } },
    },
  });
  if (!usuario) {
    return false;
  }
  return calcularMfaSetupRequired(
    usuario.rol?.codigo,
    Boolean(usuario.mfaEnabled),
  );
}
