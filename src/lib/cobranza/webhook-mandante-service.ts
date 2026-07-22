/**
 * Webhooks salientes a mandantes firmados con HMAC-SHA256 (I054).
 *
 * Headers:
 * - X-FlowPay-Signature: sha256=<hex>
 * - X-FlowPay-Timestamp: unix seconds
 * - X-FlowPay-Event: nombre del evento
 *
 * Firma = HMAC_SHA256(secret, `${timestamp}.${rawBody}`)
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/utils/logger';

export type WebhookEvento =
  | 'pago.creado'
  | 'acuerdo.creado'
  | 'importacion.completada';

export interface WebhookPayload {
  id: string;
  event: WebhookEvento;
  createdAt: string;
  idmandante: number;
  data: Record<string, unknown>;
}

const TIMEOUT_MS = 8_000;

export function firmarWebhookPayload(
  secret: string,
  timestamp: number,
  rawBody: string,
): string {
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return `sha256=${digest}`;
}

export function verificarFirmaWebhook(params: {
  secret: string;
  timestamp: number;
  rawBody: string;
  signatureHeader: string;
  toleranciaSegundos?: number;
}): boolean {
  const { secret, timestamp, rawBody, signatureHeader } = params;
  const tolerancia = params.toleranciaSegundos ?? 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerancia) {
    return false;
  }

  const expected = firmarWebhookPayload(secret, timestamp, rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader.trim());
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

async function entregarHttp(params: {
  url: string;
  secret: string;
  payload: WebhookPayload;
}): Promise<{ ok: boolean; status?: number; error?: string }> {
  const rawBody = JSON.stringify(params.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = firmarWebhookPayload(params.secret, timestamp, rawBody);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(params.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FlowPay-Signature': signature,
        'X-FlowPay-Timestamp': String(timestamp),
        'X-FlowPay-Event': params.payload.event,
        'User-Agent': 'FlowPay-Webhooks/1.0',
      },
      body: rawBody,
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error de red',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Publica evento de dominio (outbox I007) y drena en background.
 * Si `event_bus_webhooks` está off → despacho directo (compat).
 */
export function encolarWebhookMandante(params: {
  idmandante: number;
  event: WebhookEvento;
  data: Record<string, unknown>;
}): void {
  void (async () => {
    try {
      const { isFeatureEnabled, FEATURE_FLAG } = await import(
        '@/lib/feature-flags/feature-flag-service'
      );
      const usarBus = await isFeatureEnabled(
        FEATURE_FLAG.EVENT_BUS_WEBHOOKS,
        params.idmandante,
        true,
      );
      if (!usarBus) {
        await despacharWebhookMandante(params);
        return;
      }
      const { publishDomainEvent, drainDomainEvents } = await import(
        '@/lib/events/domain-event-bus'
      );
      await publishDomainEvent({
        tipo: params.event,
        idmandante: params.idmandante,
        data: params.data,
      });
      await drainDomainEvents(5);
    } catch (err) {
      logger.error(
        'Webhook/outbox mandante falló; intento directo',
        err instanceof Error ? err : undefined,
        { idmandante: params.idmandante, event: params.event },
      );
      await despacharWebhookMandante(params);
    }
  })().catch((err: unknown) => {
    logger.error(
      'Webhook mandante falló',
      err instanceof Error ? err : undefined,
      { idmandante: params.idmandante, event: params.event },
    );
  });
}

export async function despacharWebhookMandante(params: {
  idmandante: number;
  event: WebhookEvento;
  data: Record<string, unknown>;
}): Promise<boolean> {
  const mandante = await prisma.tbl_mandante.findFirst({
    where: {
      idmandante: params.idmandante,
      deletedAt: null,
      webhookActivo: true,
    },
    select: {
      webhookUrl: true,
      webhookSecret: true,
    },
  });

  if (!mandante?.webhookUrl || !mandante.webhookSecret) {
    return false;
  }

  const payload: WebhookPayload = {
    id: `${params.event}-${params.idmandante}-${Date.now()}`,
    event: params.event,
    createdAt: new Date().toISOString(),
    idmandante: params.idmandante,
    data: params.data,
  };

  const result = await entregarHttp({
    url: mandante.webhookUrl,
    secret: mandante.webhookSecret,
    payload,
  });

  if (!result.ok) {
    logger.warn('Webhook mandante no entregado', {
      idmandante: params.idmandante,
      event: params.event,
      status: result.status,
      error: result.error,
    });
    return false;
  }

  return true;
}
