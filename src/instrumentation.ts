/**
 * Warming de conexión Prisma (cold start Vercel / serverless).
 * CFG-01: valida env Zod al boot (falla rápido si JWT/DB inválidos).
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  await import('@/lib/env');

  const { prisma } = await import('@/lib/prisma');
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    // El readiness endpoint reportará el fallo; no abortar el boot.
  }
}
