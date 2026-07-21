/**
 * SERVICIO DE AUTENTICACIÓN
 * 
 * Maneja el login, verificación de usuarios y sesiones
 */

import { prisma } from "@/lib/prisma";
import { verifyPassword, simpleHash, hashPassword, isBcryptHash } from "./password";
import { type JWTPayload , generateToken } from "./jwt";
import { obtenerPermisosUsuario } from "@/lib/permissions/permission-service";
import { emitirTokenMfaPending } from "@/lib/auth/mfa-pending";

import { logger } from "@/lib/utils/logger";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  mfaRequired?: boolean;
  mfaPendingToken?: string;
  permisos?: string[];
  usuario?: {
    idusuario: number;
    nombre: string;
    email: string;
    idrol: number;
    rolCodigo: string;
  };
  error?: string;
}

/**
 * Autentica un usuario con email y contraseña
 */
export async function authenticateUser(
  credentials: LoginCredentials
): Promise<AuthResult> {
  try {
    // Buscar usuario por email
    const usuario = await prisma.tbl_usuario.findFirst({
      where: {
        email: credentials.email,
        activo: true,
        deletedAt: null,
      },
      include: {
        rol: {
          select: {
            idrol: true,
            codigo: true,
            descripcion: true,
          },
        },
      },
    });

    if (!usuario) {
      return {
        success: false,
        error: "Credenciales inválidas",
      };
    }

    // Verificar contraseña
    // Soporta bcrypt (nuevo) y SHA-256 (legacy para migración)
    let passwordValid = false;
    let requiereUpgradeHash = false;

    if (usuario.passwordHash) {
      // Usar verifyPassword que soporta bcrypt y SHA-256 legacy
      passwordValid = await verifyPassword(
        credentials.password,
        usuario.passwordHash,
        usuario.salt || ""
      );
      requiereUpgradeHash =
        passwordValid && !isBcryptHash(usuario.passwordHash);
    } else if (usuario.password) {
      // Para usuarios existentes sin hash/salt, comparar hash simple SHA-256
      passwordValid = simpleHash(credentials.password) === usuario.password;
      requiereUpgradeHash = passwordValid;
    } else {
      return {
        success: false,
        error: "Usuario sin contraseña configurada",
      };
    }

    if (!passwordValid) {
      return {
        success: false,
        error: "Credenciales inválidas",
      };
    }

    if (requiereUpgradeHash) {
      const { hash, salt } = await hashPassword(credentials.password);
      await prisma.tbl_usuario.update({
        where: { idusuario: usuario.idusuario },
        data: {
          passwordHash: hash,
          salt,
          password: null,
        },
      });
    }

    if (usuario.mfaEnabled && usuario.mfaSecret) {
      const mfaPendingToken = await emitirTokenMfaPending(usuario.idusuario);
      return {
        success: true,
        mfaRequired: true,
        mfaPendingToken,
      };
    }

    // Generar token JWT
    const permisos = await obtenerPermisosUsuario(usuario.idusuario);

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
    };

    const token = generateToken(payload);

    // Actualizar último acceso
    await prisma.tbl_usuario.update({
      where: { idusuario: usuario.idusuario },
      data: {
        ultimoAcceso: new Date(),
      },
    });

    return {
      success: true,
      token,
      permisos,
      usuario: {
        idusuario: usuario.idusuario,
        nombre: usuario.nombre,
        email: usuario.email,
        idrol: usuario.idrol || 0,
        rolCodigo: usuario.rol?.codigo ?? '',
      },
    };
  } catch (error: unknown) {
    logger.error("Error en autenticación", error instanceof Error ? error : undefined, {
      email: credentials.email,
    });
    return {
      success: false,
      error: "Error al autenticar usuario",
    };
  }
}

/**
 * Obtiene un usuario por ID (para verificación de sesión)
 */
export async function getUserById(idusuario: number) {
  return await prisma.tbl_usuario.findFirst({
    where: {
      idusuario,
      activo: true,
      deletedAt: null,
    },
    include: {
      rol: {
        select: {
          idrol: true,
          codigo: true,
          descripcion: true,
        },
      },
    },
  });
}

/**
 * Obtiene un usuario por email
 */
export async function getUserByEmail(email: string) {
  return await prisma.tbl_usuario.findFirst({
    where: {
      email,
      activo: true,
      deletedAt: null,
    },
    include: {
      rol: {
        select: {
          idrol: true,
          codigo: true,
          descripcion: true,
        },
      },
    },
  });
}

