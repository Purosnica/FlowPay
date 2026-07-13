import { prisma } from '@/lib/prisma';
import { rateLimiter, RATE_LIMIT_CONFIG } from '@/lib/security/rate-limit';
import { usarRateLimitDb } from '@/lib/scalability/scalability-config';
import { logger } from '@/lib/utils/logger';

export { RATE_LIMIT_CONFIG };

async function checkRateLimitDb(
  clave: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  const ventanaInicio = new Date(Math.floor(now / windowMs) * windowMs);
  const expiraEn = new Date(ventanaInicio.getTime() + windowMs);

  await prisma.$executeRaw`
    INSERT INTO tbl_rate_limit (clave, ventanaInicio, conteo, expiraEn)
    VALUES (${clave}, ${ventanaInicio}, 1, ${expiraEn})
    ON DUPLICATE KEY UPDATE conteo = conteo + 1
  `;

  const row = await prisma.tbl_rate_limit.findUnique({
    where: {
      clave_ventanaInicio: {
        clave,
        ventanaInicio,
      },
    },
    select: { conteo: true },
  });

  return (row?.conteo ?? 1) <= maxRequests;
}

/**
 * Rate limit compatible con múltiples instancias (DB en producción).
 * Si la BD falla en producción → fail-closed (deniega) para no abrir bypass.
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  if (!usarRateLimitDb()) {
    return rateLimiter.check(identifier, maxRequests, windowMs);
  }

  try {
    return await checkRateLimitDb(identifier, maxRequests, windowMs);
  } catch (error) {
    logger.error(
      'Rate limit DB falló',
      error instanceof Error ? error : undefined,
    );
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    return rateLimiter.check(identifier, maxRequests, windowMs);
  }
}
