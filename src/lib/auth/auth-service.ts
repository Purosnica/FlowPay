/**
 * SERVICIO DE AUTENTICACIÓN
 * 
 * Maneja el login, verificación de usuarios y sesiones
 */

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, simpleHash } from "./password";
import { generateToken, JWTPayload } from "./jwt";
import { logger } from "@/lib/utils/logger";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  usuario?: {
    idusuario: number;
    nombre: string;
    email: string;
    idrol: number;
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

    if (usuario.passwordHash) {
      // Usar verifyPassword que soporta bcrypt y SHA-256 legacy
      passwordValid = await verifyPassword(
        credentials.password,
        usuario.passwordHash,
        usuario.salt || ""
      );
    } else if (usuario.password) {
      // Para usuarios existentes sin hash/salt, comparar hash simple SHA-256
      passwordValid = simpleHash(credentials.password) === usuario.password;
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

    // Generar token JWT
    const payload: JWTPayload = {
      idusuario: usuario.idusuario,
      email: usuario.email,
      nombre: usuario.nombre,
      idrol: usuario.idrol || 0,
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
      usuario: {
        idusuario: usuario.idusuario,
        nombre: usuario.nombre,
        email: usuario.email,
        idrol: usuario.idrol || 0,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    logger.error("Error en autenticación", error instanceof Error ? error : undefined, {
      email: credentials.email,
    });
    return {
      success: false,
      error: errorMessage || "Error al autenticar usuario",
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

