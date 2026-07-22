/**
 * Worker de cron operativo (I001).
 * Proceso Node separado del monólito Next.js.
 *
 * Uso: npm run worker:cron
 * Env: WORKER_CRON_INTERVAL_MS (default 300000 = 5 min)
 */

import 'dotenv/config';
import { registerGracefulShutdownHandlers, isShuttingDown } from '@/lib/scalability/graceful-shutdown';
import { ejecutarCronOperacionesCobranza } from '@/lib/cron/cron-orchestrator';
import { logger } from '@/lib/utils/logger';

const INTERVAL_MS = Number(process.env.WORKER_CRON_INTERVAL_MS ?? 300_000);

async function ciclo(): Promise<void> {
  if (isShuttingDown()) {
    return;
  }
  const result = await ejecutarCronOperacionesCobranza('manual');
  logger.info('worker-cron ciclo', {
    estado: result.estado,
    errores: result.errores,
    omitidos: result.omitidos,
  });
}

async function main(): Promise<void> {
  registerGracefulShutdownHandlers();
  logger.info('worker-cron iniciado', { intervalMs: INTERVAL_MS });

  await ciclo();

  const timer = setInterval(() => {
    void ciclo().catch((err: unknown) => {
      logger.error(
        'worker-cron fallo',
        err instanceof Error ? err : undefined,
      );
    });
  }, INTERVAL_MS);

  const waitShutdown = (): Promise<void> =>
    new Promise((resolve) => {
      const check = (): void => {
        if (isShuttingDown()) {
          clearInterval(timer);
          resolve();
          return;
        }
        setTimeout(check, 1000);
      };
      check();
    });

  await waitShutdown();
  logger.info('worker-cron detenido');
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
