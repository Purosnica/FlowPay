/**
 * API ROUTE: USUARIO ACTUAL
 * 
 * GET /api/auth/me
 * Obtiene la información del usuario autenticado
 */

import { type NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { obtenerPermisosUsuario } from "@/lib/permissions/permission-service";
import { generateToken } from "@/lib/auth/jwt";
import { getUserById } from "@/lib/auth/auth-service";

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

    const permisos = await obtenerPermisosUsuario(usuario.idusuario);
    const usuarioCompleto = await getUserById(usuario.idusuario);

    const tokenNuevo = generateToken({
      idusuario: usuario.idusuario,
      email: usuario.email,
      nombre: usuario.nombre,
      idrol: usuario.idrol,
      permisos,
    });

    const response = NextResponse.json({
      success: true,
      usuario: {
        ...usuario,
        rolCodigo: usuarioCompleto?.rol?.codigo ?? '',
      },
      permisos,
    });

    response.cookies.set("auth-token", tokenNuevo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}



