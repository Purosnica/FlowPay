/**
 * Completa el login tras verificar TOTP (paso MFA).
 */

import { prisma } from '@/lib/prisma';
import { generateToken, type JWTPayload } from '@/lib/auth/jwt';
import { obtenerPermisosUsuario } from '@/lib/permissions/permission-service';
import { verificarMfaUsuario } from '@/lib/auth/mfa-service';
import { calcularMfaSetupRequired } from '@/lib/auth/mfa-policy';
import type { AuthResult } from '@/lib/auth/auth-service';

export async function completarLoginConMfa(idusuario: number, codigo: string): Promise<AuthResult> {
  const ok = await verificarMfaUsuario(idusuario, codigo);
  if (!ok) {
    return { success: false, error: 'Código MFA inválido' };
  }

  const usuario = await prisma.tbl_usuario.findFirst({
    where: { idusuario, activo: true, deletedAt: null },
    select: {
      idusuario: true,
      idrol: true,
      nombre: true,
      email: true,
      mfaEnabled: true,
      fotoPerfilMime: true,
      updatedAt: true,
      rol: { select: { idrol: true, codigo: true, descripcion: true } },
    },
  });

  if (!usuario) {
    return { success: false, error: 'Usuario no encontrado' };
  }

  const permisos = await obtenerPermisosUsuario(usuario.idusuario);
  const rolCodigo = usuario.rol?.codigo ?? '';
  const mfaSetupRequired = calcularMfaSetupRequired(rolCodigo, Boolean(usuario.mfaEnabled));
  const ahora = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    idusuario: usuario.idusuario,
    email: usuario.email,
    nombre: usuario.nombre,
    idrol: usuario.idrol || 0,
    permisos,
    sessionStartedAt: ahora,
    lastActivityAt: ahora,
    permisosAt: ahora,
    mfaSetupRequired,
  };

  const token = generateToken(payload);

  await prisma.tbl_usuario.update({
    where: { idusuario: usuario.idusuario },
    data: { ultimoAcceso: new Date() },
  });

  return {
    success: true,
    token,
    permisos,
    mfaSetupRequired,
    usuario: {
      idusuario: usuario.idusuario,
      nombre: usuario.nombre,
      email: usuario.email,
      idrol: usuario.idrol || 0,
      rolCodigo,
      fotoPerfil: usuario.fotoPerfilMime
        ? `/api/perfil/foto?v=${usuario.updatedAt.getTime()}`
        : null,
    },
  };
}
