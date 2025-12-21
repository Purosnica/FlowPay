/**
 * API ROUTE: LOGIN
 * 
 * POST /api/auth/login
 * Autentica un usuario y retorna un token JWT
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth/auth-service";
import { z } from "zod";
import { handleApiError } from "@/lib/api/error-handler";
import { rateLimiter, RATE_LIMIT_CONFIG } from "@/lib/security/rate-limit";
import { getRequestInfo } from "@/lib/middleware/auth";
import { logger } from "@/lib/utils/logger";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

/**
 * POST /api/auth/login
 * Login de usuario
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const requestInfo = getRequestInfo(req);
    const identifier = requestInfo.ip || "unknown";
    const isAllowed = rateLimiter.check(
      `login:${identifier}`,
      RATE_LIMIT_CONFIG.LOGIN.maxRequests,
      RATE_LIMIT_CONFIG.LOGIN.windowMs
    );

    if (!isAllowed) {
      logger.warn("Rate limit excedido en login", { ip: identifier });
      return NextResponse.json(
        {
          success: false,
          error: "Demasiados intentos de login. Por favor, intente más tarde.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(RATE_LIMIT_CONFIG.LOGIN.windowMs / 1000)),
          },
        }
      );
    }

    const body = await req.json();
    const credentials = loginSchema.parse(body);

    // Autenticar usuario
    const result = await authenticateUser(credentials);

    if (!result.success || !result.token || !result.usuario) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Credenciales inválidas",
        },
        { status: 401 }
      );
    }

    // Crear respuesta con token en cookie y en body
    const response = NextResponse.json({
      success: true,
      usuario: result.usuario,
      token: result.token,
    });

    // Configurar cookie HTTP-only para seguridad con expiración de 8 horas
    // 8 horas = 60 segundos * 60 minutos * 8 horas = 28800 segundos
    response.cookies.set("auth-token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 horas (en lugar de 7 días para mayor seguridad)
      path: "/",
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}



