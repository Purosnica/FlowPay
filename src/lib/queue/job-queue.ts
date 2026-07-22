/**
 * Cola MySQL con backpressure para imports y outbox (I002).
 * Sin Redis/SQS/BullMQ.
 */

import { prisma } from '@/lib/prisma';
import {
  crearImportacionJob,
  procesarImportacionesPendientes,
  type CrearImportacionJobInput,
  type ImportacionJobResumen,
} from '@/lib/cobranza/import/importacion-job-service';
import { procesarOutboxEmailNotificaciones } from '@/lib/cobranza/notificacion-outbox-service';
import { drainDomainEvents } from '@/lib/events/domain-event-bus';
import {
  obtenerImportMaxConcurrent,
  obtenerImportMaxJobsPerRun,
} from '@/lib/scalability/scalability-config';

/** Máximo de jobs PENDIENTE por mandante antes de rechazar enqueue. */
export const IMPORT_PENDING_BACKPRESSURE_PER_MANDANTE = 25;

export class QueueBackpressureError extends Error {
  readonly code = 'QUEUE_BACKPRESSURE';

  constructor(message: string) {
    super(message);
    this.name = 'QueueBackpressureError';
  }
}

export async function contarImportsPendientesMandante(
  idmandante: number,
): Promise<number> {
  return prisma.tbl_importacion_job.count({
    where: {
      idmandante,
      estado: { in: ['PENDIENTE', 'PROCESANDO'] },
    },
  });
}

/**
 * Encola import con backpressure por mandante.
 */
export async function enqueueImport(
  input: CrearImportacionJobInput,
  limitePendientes = IMPORT_PENDING_BACKPRESSURE_PER_MANDANTE,
): Promise<ImportacionJobResumen> {
  const pendientes = await contarImportsPendientesMandante(input.idmandante);
  if (pendientes >= limitePendientes) {
    throw new QueueBackpressureError(
      `Cola de importaciones saturada para mandante ${input.idmandante} (${pendientes}/${limitePendientes}). Reintente más tarde.`,
    );
  }
  return crearImportacionJob(input);
}

export async function drainImportQueue(maxJobs?: number): Promise<{
  procesados: number;
  errores: number;
}> {
  return procesarImportacionesPendientes(
    maxJobs ?? obtenerImportMaxJobsPerRun(),
  );
}

export async function drainEmailOutbox(): Promise<{
  enviados: number;
  fallidos: number;
}> {
  return procesarOutboxEmailNotificaciones();
}

/**
 * Ciclo completo del worker-queue (imports + email + domain events).
 */
export async function drainAllQueues(): Promise<{
  imports: { procesados: number; errores: number };
  email: { enviados: number; fallidos: number };
  events: { procesados: number; errores: number };
  concurrentCap: number;
}> {
  const imports = await drainImportQueue();
  const email = await drainEmailOutbox();
  const events = await drainDomainEvents(30);
  return {
    imports,
    email,
    events,
    concurrentCap: obtenerImportMaxConcurrent(),
  };
}

export function puedeAceptarMasImports(pendientes: number): boolean {
  return pendientes < IMPORT_PENDING_BACKPRESSURE_PER_MANDANTE;
}
