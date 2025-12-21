/**
 * MIDDLEWARE DE AUTENTICACIÓN Y PERMISOS
 * 
 * Este middleware valida la autenticación y permisos para las API Routes
 */

import { NextRequest } from "next/server";
import { requerirPermiso, tienePermiso } from "@/lib/permissions/permission-service";
import { verifyToken, JWTPayload } from "@/lib/auth/jwt";
import { getUserById } from "@/lib/auth/auth-service";

export interface UsuarioAutenticado {
  idusuario: number;
  nombre: string;
  email: string;
  idrol: number;
}

/**
 * Obtiene el token JWT desde la request
 */
function getTokenFromRequest(req: NextRequest): string | null {
  // Intentar obtener desde header Authorization
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[Auth] Token encontrado en header Authorization");
    }
    return token;
  }

  // Intentar obtener desde cookie
  const tokenCookie = req.cookies.get("auth-token");
  if (tokenCookie) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[Auth] Token encontrado en cookie");
    }
    return tokenCookie.value;
  }

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[Auth] No se encontró token en header ni cookie");
    // eslint-disable-next-line no-console
    console.log("[Auth] Headers disponibles:", Array.from(req.headers.entries()).map((entry) => entry[0]));
    // eslint-disable-next-line no-console
    const cookieNames: string[] = [];
    req.cookies.getAll().forEach((cookie) => {
      cookieNames.push(cookie.name);
    });
    // eslint-disable-next-line no-console
    console.log("[Auth] Cookies disponibles:", cookieNames);
  }

  return null;
}

/**
 * Obtiene el usuario autenticado desde la request
 */
export async function getCurrentUser(
  req: NextRequest
): Promise<UsuarioAutenticado | null> {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return null;
    }

    // Verificar y decodificar token
    const payload = verifyToken(token);

    // Obtener usuario de la base de datos para verificar que aún existe y está activo
    const usuario = await getUserById(payload.idusuario);
    if (!usuario) {
      return null;
    }

    return {
      idusuario: usuario.idusuario,
      nombre: usuario.nombre,
      email: usuario.email,
      idrol: usuario.idrol || 0,
    };
  } catch (error) {
    // Token inválido o expirado
    return null;
  }
}

/**
 * Middleware que requiere autenticación
 */
export async function requireAuth(
  req: NextRequest
): Promise<UsuarioAutenticado> {
  const usuario = await getCurrentUser(req);
  if (!usuario) {
    throw new Error("No autenticado. Por favor, inicia sesión.");
  }
  return usuario;
}

/**
 * Middleware que requiere un permiso específico
 */
export async function requirePermission(
  req: NextRequest,
  permiso: string
): Promise<UsuarioAutenticado> {
  const usuario = await requireAuth(req);
  await requerirPermiso(usuario.idusuario, permiso);
  return usuario;
}

/**
 * Obtiene información de la request para auditoría
 */
export function getRequestInfo(req: NextRequest): {
  ip: string | null;
  userAgent: string | null;
} {
  return {
    ip:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null,
    userAgent: req.headers.get("user-agent") || null,
  };
}

