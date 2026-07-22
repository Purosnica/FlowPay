/**
 * Domain event bus + outbox MySQL (I007).
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/utils/logger';
import {
  despacharWebhookMandante,
  type WebhookEvento,
} from '@/lib/cobranza/webhook-mandante-service';
import { isShuttingDown } from '@/lib/scalability/graceful-shutdown';

export type DomainEventTipo =
  | WebhookEvento
  | 'prestamo.estado_cambiado'
  | 'liquidacion.generada'
  | 'gestion.creada';

const WEBHOOK_TIPOS = new Set<string>([
  'pago.creado',
  'acuerdo.creado',
  'importacion.completada',
]);

const MAX_INTENTOS = 5;

export async function publishDomainEvent(params: {
  tipo: DomainEventTipo | string;
  idmandante?: number | null;
  data: Record<string, unknown>;
}): Promise<number> {
  const row = await prisma.tbl_domain_event.create({
    data: {
      tipo: params.tipo,
      idmandante: params.idmandante ?? null,
      payload: JSON.stringify(params.data),
      estado: 'PENDIENTE',
    },
    select: { idevento: true },
  });
  return row.idevento;
}

function parsePayload(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

async function marcarPublicado(
  idevento: number,
  intentos: number,
): Promise<void> {
  await prisma.tbl_domain_event.update({
    where: { idevento },
    data: {
      estado: 'PUBLICADO',
      publishedAt: new Date(),
      intentos: intentos + 1,
      error: null,
    },
  });
}

async function procesarEvento(evento: {
  idevento: number;
  tipo: string;
  payload: string;
  idmandante: number | null;
  intentos: number;
}): Promise<void> {
  const data = parsePayload(evento.payload);

  if (WEBHOOK_TIPOS.has(evento.tipo) && evento.idmandante) {
    const mandante = await prisma.tbl_mandante.findFirst({
      where: {
        idmandante: evento.idmandante,
        deletedAt: null,
        webhookActivo: true,
      },
      select: { webhookUrl: true, webhookSecret: true },
    });

    if (!mandante?.webhookUrl || !mandante.webhookSecret) {
      await marcarPublicado(evento.idevento, evento.intentos);
      return;
    }

    const ok = await despacharWebhookMandante({
      idmandante: evento.idmandante,
      event: evento.tipo as WebhookEvento,
      data,
    });
    if (!ok) {
      throw new Error(`Webhook no entregado: ${evento.tipo}`);
    }
  }

  await marcarPublicado(evento.idevento, evento.intentos);
}

/**
 * Drena eventos PENDIENTE (worker / post-publish).
 */
export async function drainDomainEvents(
  maxEvents = 20,
): Promise<{ procesados: number; errores: number }> {
  const pendientes = await prisma.tbl_domain_event.findMany({
    where: { estado: 'PENDIENTE' },
    orderBy: { createdAt: 'asc' },
    take: maxEvents,
  });

  let procesados = 0;
  let errores = 0;

  for (const evento of pendientes) {
    if (isShuttingDown()) {
      break;
    }
    try {
      await procesarEvento(evento);
      procesados += 1;
    } catch (err) {
      errores += 1;
      const intentos = evento.intentos + 1;
      const mensaje =
        err instanceof Error ? err.message : 'Error publicando evento';
      await prisma.tbl_domain_event.update({
        where: { idevento: evento.idevento },
        data: {
          intentos,
          error: mensaje.slice(0, 2000),
          estado: intentos >= MAX_INTENTOS ? 'FALLIDO' : 'PENDIENTE',
        },
      });
      logger.warn('Domain event falló', {
        idevento: evento.idevento,
        tipo: evento.tipo,
        intentos,
      });
    }
  }

  return { procesados, errores };
}
