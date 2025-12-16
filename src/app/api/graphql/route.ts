import { createYoga } from "graphql-yoga";
import { schema } from "@/lib/graphql/schema";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { handleError } from "@/lib/errors/app-error";

// Crear instancia de Yoga GraphQL
const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  context: async (req: NextRequest) => {
    // Aquí puedes agregar lógica de autenticación
    // const token = req.headers.get("authorization")?.replace("Bearer ", "");
    // const user = await getCurrentUser(token);
    
    return {
      prisma,
      // user,
      // req,
    };
  },
  // Manejo de errores
  maskedErrors: process.env.NODE_ENV === "production",
  graphiql: process.env.NODE_ENV === "development",
});

export async function GET(request: NextRequest) {
  try {
    return await handleRequest(request, {});
  } catch (error) {
    const { statusCode, message } = handleError(error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleRequest(request, {});
  } catch (error) {
    const { statusCode, message } = handleError(error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
