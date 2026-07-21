import { z } from 'zod';

const nodeEnv = process.env.NODE_ENV || 'development';
const isDevelopment = nodeEnv === 'development';
const isProduction = nodeEnv === 'production';

const envSchema = z.object({
  
  DATABASE_URL: isDevelopment
    ? z.string().url().optional()
    : z.string().url('DATABASE_URL debe ser una URL válida'),

  JWT_SECRET: isProduction
    ? z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres')
    : z.string().min(1).optional(),

  CRON_SECRET: isProduction
    ? z.string().min(16, 'CRON_SECRET debe tener al menos 16 caracteres')
    : z.string().min(1).optional(),

  // Vacío / ausente = same-origin (recomendado en Vercel y producción).
  NEXT_PUBLIC_API_URL: z.union([z.string().url(), z.literal('')]).optional(),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  IMPORT_MAX_JOBS_PER_RUN: z.coerce.number().int().positive().default(1),
  IMPORT_MAX_CONCURRENT: z.coerce.number().int().positive().default(1),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  CRON_RETENTION_DAYS: z.coerce.number().int().positive().default(90),

  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().min(1).optional().default('Cobranza TicTac'),

  /** DSN servidor (opcional). Si falta, se usa NEXT_PUBLIC_SENTRY_DSN. */
  SENTRY_DSN: z.union([z.string().url(), z.literal('')]).optional(),
  NEXT_PUBLIC_SENTRY_DSN: z
    .union([z.string().url(), z.literal('')])
    .optional(),
});

function getEnv() {
  try {
    return envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      CRON_SECRET: process.env.CRON_SECRET,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NODE_ENV: nodeEnv,
      LOG_LEVEL: process.env.LOG_LEVEL,
      IMPORT_MAX_JOBS_PER_RUN: process.env.IMPORT_MAX_JOBS_PER_RUN,
      IMPORT_MAX_CONCURRENT: process.env.IMPORT_MAX_CONCURRENT,
      AUDIT_RETENTION_DAYS: process.env.AUDIT_RETENTION_DAYS,
      CRON_RETENTION_DAYS: process.env.CRON_RETENTION_DAYS,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_SECURE: process.env.SMTP_SECURE,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_FROM: process.env.SMTP_FROM,
      SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
      SENTRY_DSN: process.env.SENTRY_DSN,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
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
