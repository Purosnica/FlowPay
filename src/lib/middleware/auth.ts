/**
 * Middleware de autenticación y permisos para API Routes.
 */

import type { NextRequest } from 'next/server';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { verifyToken } from '@/lib/auth/jwt';
import { getUserById } from '@/lib/auth/auth-service';

export interface UsuarioAutenticado {
  idusuario: number;
  nombre: string;
  email: string;
  idrol: number;
}

function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }

  const tokenCookie = req.cookies.get('auth-token');
  if (tokenCookie) {
    return tokenCookie.value;
  }

  return null;
}

/**
 * Obtiene el usuario autenticado desde la request
 */
export async function getCurrentUser(
  req: NextRequest,
): Promise<UsuarioAutenticado | null> {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return null;
    }

    const payload = verifyToken(token);

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
  } catch {
    return null;
  }
}

/**
 * Middleware que requiere autenticación
 */
export async function requireAuth(
  req: NextRequest,
): Promise<UsuarioAutenticado> {
  const usuario = await getCurrentUser(req);
  if (!usuario) {
    throw new Error('No autenticado. Por favor, inicia sesión.');
  }
  return usuario;
}

/**
 * Middleware que requiere un permiso específico
 */
export async function requirePermission(
  req: NextRequest,
  permiso: string,
): Promise<UsuarioAutenticado> {
  const usuario = await requireAuth(req);
  await requerirPermiso(usuario.idusuario, permiso);
  return usuario;
}

/**
 * Obtiene IP del cliente para rate-limit / auditoría.
 * No confía en X-Forwarded-For enviado por el cliente salvo TRUST_PROXY=true
 * (reverse proxy que sobrescribe/añade el hop).
 */
export function getRequestInfo(req: NextRequest): {
  ip: string | null;
  userAgent: string | null;
} {
  return {
    ip: resolverIpCliente(req),
    userAgent: req.headers.get('user-agent') || null,
  };
}

/**
 * Resuelve IP solo cuando TRUST_PROXY=true (proxy de confianza reescribe headers).
 * Sin eso, no se usan X-Forwarded-For ni X-Real-IP (spoofables por el cliente).
 */
export function resolverIpCliente(req: NextRequest): string | null {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  if (!trustProxy) {
    return null;
  }

  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }

  const xff = req.headers.get('x-forwarded-for');
  if (!xff) {
    return null;
  }
  // Con proxy en modo append, el último hop es el añadido por la infra.
  const partes = xff
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return partes.length > 0 ? (partes[partes.length - 1] ?? null) : null;
}
