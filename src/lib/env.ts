import { z } from 'zod';

const nodeEnv = process.env.NODE_ENV || 'development';
const isDevelopment = nodeEnv === 'development';
const isProduction = nodeEnv === 'production';

const envSchema = z.object({
  DATABASE_URL: isDevelopment
    ? z.string().url().optional()
    : z.string().url('DATABASE_URL debe ser una URL válida'),

  NEXTAUTH_SECRET: isDevelopment
    ? z.string().min(1).optional()
    : z.string().min(32, 'NEXTAUTH_SECRET debe tener al menos 32 caracteres'),
  NEXTAUTH_URL: isDevelopment
    ? z.string().url().optional()
    : z.string().url('NEXTAUTH_URL debe ser una URL válida'),

  JWT_SECRET: isProduction
    ? z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres')
    : z.string().min(1).optional(),

  CRON_SECRET: isProduction
    ? z.string().min(16, 'CRON_SECRET debe tener al menos 16 caracteres')
    : z.string().min(1).optional(),

  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .optional()
    .default('http://localhost:3000'),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  IMPORT_MAX_JOBS_PER_RUN: z.coerce.number().int().positive().default(1),
  IMPORT_MAX_CONCURRENT: z.coerce.number().int().positive().default(1),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  CRON_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
});

function getEnv() {
  try {
    return envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      JWT_SECRET: process.env.JWT_SECRET,
      CRON_SECRET: process.env.CRON_SECRET,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NODE_ENV: nodeEnv,
      LOG_LEVEL: process.env.LOG_LEVEL,
      IMPORT_MAX_JOBS_PER_RUN: process.env.IMPORT_MAX_JOBS_PER_RUN,
      IMPORT_MAX_CONCURRENT: process.env.IMPORT_MAX_CONCURRENT,
      AUDIT_RETENTION_DAYS: process.env.AUDIT_RETENTION_DAYS,
      CRON_RETENTION_DAYS: process.env.CRON_RETENTION_DAYS,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((e: z.ZodIssue) => e.path.join('.'))
        .join(', ');
      throw new Error(
        `❌ Variables de entorno faltantes o inválidas: ${missingVars}\n` +
          'Por favor, revisa tu archivo .env',
      );
    }
    throw error;
  }
}

export const env = getEnv();
