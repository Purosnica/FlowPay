/**
 * MIDDLEWARE DE NEXT.JS
 * 
 * Protege rutas que requieren autenticación
 * SIEMPRE redirige a /login si no hay token
 * Agrega headers de seguridad
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas públicas que no requieren autenticación
const publicRoutes = ["/login"];

// Rutas de API públicas que no requieren autenticación
const publicApiRoutes = ["/api/auth/login", "/api/auth/logout", "/api/auth/me"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Excluir assets estáticos y rutas internas de Next.js PRIMERO
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Permitir rutas públicas de páginas
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Permitir rutas de API públicas
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Verificar token en cookie
  const token = request.cookies.get("auth-token")?.value;

  // SI NO HAY TOKEN, SIEMPRE REDIRIGIR A LOGIN
  if (!token || token.trim() === "") {
    // Si es una API route protegida, retornar 401
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }
    
    // Para CUALQUIER otra ruta (incluyendo "/"), redirigir a login
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/login" && pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    // Usar redirect absoluto para asegurar que funcione
    return NextResponse.redirect(loginUrl);
  }

  // Si hay token, permitir acceso
  const response = NextResponse.next();

  // Agregar headers de seguridad
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Content Security Policy básico
  // Nota: Ajustar según las necesidades específicas de la aplicación
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Ajustar según necesidades
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);

  // Strict Transport Security (solo en producción con HTTPS)
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

