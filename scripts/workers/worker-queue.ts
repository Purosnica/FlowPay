/**
 * Worker de colas MySQL: imports, email outbox, domain events (I001/I002/I007).
 *
 * Uso: npm run worker:queue
 * Env: WORKER_QUEUE_INTERVAL_MS (default 15000)
 */

import 'dotenv/config';
import {
  registerGracefulShutdownHandlers,
  isShuttingDown,
} from '@/lib/scalability/graceful-shutdown';
import { drainAllQueues } from '@/lib/queue/job-queue';
import { logger } from '@/lib/utils/logger';

const INTERVAL_MS = Number(process.env.WORKER_QUEUE_INTERVAL_MS ?? 15_000);

async function ciclo(): Promise<void> {
  if (isShuttingDown()) {
    return;
  }
  const result = await drainAllQueues();
  logger.info('worker-queue ciclo', {
    imports: result.imports,
    email: result.email,
    events: result.events,
  });
}

async function main(): Promise<void> {
  registerGracefulShutdownHandlers();
  logger.info('worker-queue iniciado', { intervalMs: INTERVAL_MS });

  await ciclo();

  const timer = setInterval(() => {
    void ciclo().catch((err: unknown) => {
      logger.error(
        'worker-queue fallo',
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
  logger.info('worker-queue detenido');
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
