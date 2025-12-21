/**
 * API ROUTE: LOGOUT
 * 
 * POST /api/auth/logout
 * Cierra la sesión del usuario
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";

/**
 * POST /api/auth/logout
 * Logout de usuario
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado
    await requireAuth(req);

    // Crear respuesta
    const response = NextResponse.json({
      success: true,
      message: "Sesión cerrada exitosamente",
    });

    // Eliminar cookie de autenticación estableciendo maxAge a 0
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Eliminar cookie inmediatamente
      path: "/",
    });

    return response;
  } catch (error: any) {
    // Si no está autenticado, igualmente eliminar la cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "Sesión cerrada",
      },
      { status: 200 }
    );

    // Eliminar cookie de autenticación estableciendo maxAge a 0
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Eliminar cookie inmediatamente
      path: "/",
    });
    return response;
  }
}



