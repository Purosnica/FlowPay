/**
 * API ROUTE: USUARIO ACTUAL
 * 
 * GET /api/auth/me
 * Obtiene la información del usuario autenticado
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";

/**
 * GET /api/auth/me
 * Obtener usuario actual
 */
export async function GET(req: NextRequest) {
  try {
    const usuario = await getCurrentUser(req);

    if (!usuario) {
      return NextResponse.json(
        {
          success: false,
          error: "No autenticado. Por favor, inicia sesión.",
        },
        { status: 401 }
      );
    }

    // Obtener el token de la cookie para retornarlo
    const tokenCookie = req.cookies.get("auth-token");
    const token = tokenCookie?.value || null;

    return NextResponse.json({
      success: true,
      usuario,
      token, // Retornar el token para que el cliente lo guarde
    });
  } catch (error) {
    return handleApiError(error);
  }
}



