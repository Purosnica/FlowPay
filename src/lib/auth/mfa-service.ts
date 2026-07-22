/**
 * TOTP (otplib) + persistencia cifrada del secreto MFA.
 */

import { authenticator } from 'otplib';
import { prisma } from '@/lib/prisma';
import { esRolGerente } from '@/lib/permissions/role-codes';
import {
  cifrarSecretoMfa,
  descifrarSecretoMfa,
} from '@/lib/auth/mfa-crypto';
import { rolRequiereMfa } from '@/lib/auth/mfa-policy';

const ISSUER = 'FlowPay';

export function generarSecretoTotp(): string {
  return authenticator.generateSecret();
}

export function construirOtpauthUrl(
  email: string,
  secret: string,
): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

export function verificarCodigoTotp(
  secret: string,
  token: string,
): boolean {
  const codigo = token.replace(/\s/g, '');
  if (!/^\d{6}$/.test(codigo)) {
    return false;
  }
  try {
    return authenticator.verify({ token: codigo, secret });
  } catch {
    return false;
  }
}

export async function usuarioPuedeGestionarMfa(
  idusuario: number,
): Promise<boolean> {
  const usuario = await prisma.tbl_usuario.findFirst({
    where: { idusuario, activo: true, deletedAt: null },
    include: { rol: { select: { codigo: true } } },
  });
  return esRolGerente(usuario?.rol?.codigo);
}

export async function iniciarSetupMfa(idusuario: number): Promise<{
  secret: string;
  otpauthUrl: string;
}> {
  const puede = await usuarioPuedeGestionarMfa(idusuario);
  if (!puede) {
    throw new Error('MFA solo disponible para ADMIN y GERENTE.');
  }

  const usuario = await prisma.tbl_usuario.findFirst({
    where: { idusuario, activo: true, deletedAt: null },
    select: { email: true, mfaEnabled: true },
  });
  if (!usuario) {
    throw new Error('Usuario no encontrado.');
  }
  if (usuario.mfaEnabled) {
    throw new Error('MFA ya está activo. Desactívelo antes de reiniciar.');
  }

  const secret = generarSecretoTotp();
  await prisma.tbl_usuario.update({
    where: { idusuario },
    data: {
      mfaSecret: cifrarSecretoMfa(secret),
      mfaEnabled: false,
      mfaEnabledAt: null,
    },
  });

  return {
    secret,
    otpauthUrl: construirOtpauthUrl(usuario.email, secret),
  };
}

export async function confirmarEnableMfa(
  idusuario: number,
  codigo: string,
): Promise<void> {
  const usuario = await prisma.tbl_usuario.findFirst({
    where: { idusuario, activo: true, deletedAt: null },
    select: { mfaSecret: true, mfaEnabled: true },
  });
  if (!usuario?.mfaSecret) {
    throw new Error('Inicie el setup MFA antes de confirmar.');
  }
  if (usuario.mfaEnabled) {
    throw new Error('MFA ya está activo.');
  }

  const secret = descifrarSecretoMfa(usuario.mfaSecret);
  if (!verificarCodigoTotp(secret, codigo)) {
    throw new Error('Código MFA inválido.');
  }

  await prisma.tbl_usuario.update({
    where: { idusuario },
    data: {
      mfaEnabled: true,
      mfaEnabledAt: new Date(),
    },
  });
}

export async function desactivarMfa(
  idusuario: number,
  codigo: string,
): Promise<void> {
  const usuario = await prisma.tbl_usuario.findFirst({
    where: { idusuario, activo: true, deletedAt: null },
    select: {
      mfaSecret: true,
      mfaEnabled: true,
      rol: { select: { codigo: true } },
    },
  });
  if (!usuario?.mfaEnabled || !usuario.mfaSecret) {
    throw new Error('MFA no está activo.');
  }
  if (rolRequiereMfa(usuario.rol?.codigo)) {
    throw new Error(
      'MFA es obligatorio para ADMIN y GERENTE; no se puede desactivar.',
    );
  }

  const secret = descifrarSecretoMfa(usuario.mfaSecret);
  if (!verificarCodigoTotp(secret, codigo)) {
    throw new Error('Código MFA inválido.');
  }

  await prisma.tbl_usuario.update({
    where: { idusuario },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      mfaEnabledAt: null,
    },
  });
}

export async function verificarMfaUsuario(
  idusuario: number,
  codigo: string,
): Promise<boolean> {
  const usuario = await prisma.tbl_usuario.findFirst({
    where: { idusuario, activo: true, deletedAt: null },
    select: { mfaSecret: true, mfaEnabled: true },
  });
  if (!usuario?.mfaEnabled || !usuario.mfaSecret) {
    return false;
  }
  const secret = descifrarSecretoMfa(usuario.mfaSecret);
  return verificarCodigoTotp(secret, codigo);
}
