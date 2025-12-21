import { createYoga } from "graphql-yoga";
import { schema } from "@/lib/graphql/schema";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { getCurrentUser, getRequestInfo } from "@/lib/middleware/auth";
import { rateLimiter, RATE_LIMIT_CONFIG } from "@/lib/security/rate-limit";
import { logger } from "@/lib/utils/logger";

// Variable para almacenar el request original
let originalRequest: NextRequest | null = null;

// Crear instancia de Yoga GraphQL
const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  context: async (req: NextRequest) => {
    try {
      // Usar el request original si está disponible, de lo contrario usar el request de Yoga
      const requestToUse = originalRequest || req;
      
      // Obtener usuario autenticado
      const usuario = await getCurrentUser(requestToUse);
      
      return {
        prisma,
        usuario: usuario ? {
          idusuario: usuario.idusuario,
          nombre: usuario.nombre,
          email: usuario.email,
          idrol: usuario.idrol,
        } : null,
      };
    } catch (error) {
      // Si hay error al obtener el usuario, retornar contexto sin usuario
      logger.error("Error al obtener usuario en contexto GraphQL", error instanceof Error ? error : undefined);
      return {
        prisma,
        usuario: null,
      };
    } finally {
      // Limpiar el request original después de usarlo
      originalRequest = null;
    }
  },
  // Manejo de errores centralizado
  // Los errores se formatean automáticamente por GraphQL Yoga
  // Si necesitamos formateo personalizado, lo hacemos en los resolvers
  maskedErrors: process.env.NODE_ENV === "production", // Ocultar errores en producción
  graphiql: process.env.NODE_ENV === "development",
});

export async function GET(request: NextRequest) {
  try {
    // Rate limiting para GraphQL
    const requestInfo = getRequestInfo(request);
    const identifier = requestInfo.ip || "unknown";
    const isAllowed = rateLimiter.check(
      `graphql:${identifier}`,
      RATE_LIMIT_CONFIG.GRAPHQL.maxRequests,
      RATE_LIMIT_CONFIG.GRAPHQL.windowMs
    );

    if (!isAllowed) {
      logger.warn("Rate limit excedido en GraphQL GET", { ip: identifier });
      return new Response(
        JSON.stringify({
          errors: [{ message: "Demasiadas solicitudes. Por favor, intente más tarde." }],
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(RATE_LIMIT_CONFIG.GRAPHQL.windowMs / 1000)),
          },
        }
      );
    }

    // Guardar el request original antes de pasarlo a Yoga
    originalRequest = request;
    return handleRequest(request, {} as any);
  } catch (error) {
    originalRequest = null;
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    logger.error("GraphQL GET Error", error instanceof Error ? error : undefined);
    // El error ya fue formateado por el plugin de Yoga
    // Solo lo logueamos y retornamos
    return new Response(
      JSON.stringify({ 
        errors: [{ message: errorMessage }],
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting para GraphQL
    const requestInfo = getRequestInfo(request);
    const identifier = requestInfo.ip || "unknown";
    const isAllowed = rateLimiter.check(
      `graphql:${identifier}`,
      RATE_LIMIT_CONFIG.GRAPHQL.maxRequests,
      RATE_LIMIT_CONFIG.GRAPHQL.windowMs
    );

    if (!isAllowed) {
      logger.warn("Rate limit excedido en GraphQL POST", { ip: identifier });
      return new Response(
        JSON.stringify({
          errors: [{ message: "Demasiadas solicitudes. Por favor, intente más tarde." }],
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(RATE_LIMIT_CONFIG.GRAPHQL.windowMs / 1000)),
          },
        }
      );
    }

    // Guardar el request original antes de pasarlo a Yoga
    originalRequest = request;
    return handleRequest(request, {} as any);
  } catch (error) {
    originalRequest = null;
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    logger.error("GraphQL POST Error", error instanceof Error ? error : undefined);
    
    // Si el error ya tiene formato GraphQL, retornarlo directamente
    const errorWithExtensions = error as { extensions?: { statusCode?: number } };
    if (errorWithExtensions.extensions) {
      return new Response(
        JSON.stringify({ 
          errors: [{
            message: errorMessage,
            extensions: errorWithExtensions.extensions,
          }],
        }),
        {
          status: errorWithExtensions.extensions.statusCode || 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Error genérico
    return new Response(
      JSON.stringify({ 
        errors: [{ 
          message: errorMessage,
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            statusCode: 500,
          },
        }],
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
