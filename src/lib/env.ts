import { z } from "zod";

const nodeEnv = process.env.NODE_ENV || "development";
const isDevelopment = nodeEnv === "development";

const envSchema = z.object({
  // Database - Opcional en desarrollo
  DATABASE_URL: isDevelopment
    ? z.string().url().optional()
    : z.string().url("DATABASE_URL debe ser una URL válida"),
  
  // NextAuth - Opcional en desarrollo
  NEXTAUTH_SECRET: isDevelopment
    ? z.string().min(1).optional()
    : z.string().min(32, "NEXTAUTH_SECRET debe tener al menos 32 caracteres"),
  NEXTAUTH_URL: isDevelopment
    ? z.string().url().optional()
    : z.string().url("NEXTAUTH_URL debe ser una URL válida"),
  
  // API - Siempre tiene un valor por defecto
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .optional()
    .default("http://localhost:3000"),
  
  // Node Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

function getEnv() {
  try {
    return envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NODE_ENV: nodeEnv,
      LOG_LEVEL: process.env.LOG_LEVEL,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e: z.ZodIssue) => e.path.join(".")).join(", ");
      throw new Error(
        `❌ Variables de entorno faltantes o inválidas: ${missingVars}\n` +
        `Por favor, revisa tu archivo .env`
      );
    }
    throw error;
  }
}

export const env = getEnv();

