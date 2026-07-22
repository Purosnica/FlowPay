/**
 * Envío de correos de cobranza vía SMTP (Google Workspace).
 */

import nodemailer, { type Transporter } from 'nodemailer';
import { z } from 'zod';
import { env } from '@/lib/env';
import { errorValidacion, ServicioError, ErrorCode } from '@/lib/services/error-types';
import { withRetry } from '@/lib/utils/with-retry';
import { getCircuitBreaker } from '@/lib/resilience/circuit-breaker';

const smtpBreaker = getCircuitBreaker('smtp', {
  failureThreshold: 5,
  cooldownMs: 60_000,
  successThreshold: 2,
});

export const EnviarEmailCobroSchema = z.object({
  to: z.string().email('Correo del deudor inválido'),
  subject: z.string().min(1, 'Asunto requerido').max(200),
  body: z.string().min(1, 'Mensaje requerido').max(20_000),
  idprestamo: z.number().int().positive('Préstamo requerido'),
  idplantilla: z.number().int().positive().optional(),
});

export type EnviarEmailCobroInput = z.infer<typeof EnviarEmailCobroSchema>;

export type EnviarEmailCobroResult = {
  messageId: string;
  accepted: string[];
};

export const EnviarEmailOperativoSchema = z.object({
  to: z.string().email('Correo destinatario inválido'),
  subject: z.string().min(1, 'Asunto requerido').max(200),
  body: z.string().min(1, 'Mensaje requerido').max(50_000),
});

export type EnviarEmailOperativoInput = z.infer<
  typeof EnviarEmailOperativoSchema
>;

export type EnviarEmailOperativoResult = EnviarEmailCobroResult;

let transporter: Transporter | null = null;

function smtpConfigurado(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

/** Indica si SMTP está listo (cron digests, etc.). */
export function smtpDisponible(): boolean {
  return smtpConfigurado();
}

function getTransporter(): Transporter {
  if (!smtpConfigurado()) {
    throw new ServicioError(
      ErrorCode.VALIDACION_ERROR,
      'SMTP no configurado. Defina SMTP_HOST, SMTP_USER y SMTP_PASS en .env',
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

function textoAHtml(texto: string): string {
  const escapado = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;line-height:1.5;">${escapado}</pre>`;
}

export async function enviarEmailCobro(
  input: EnviarEmailCobroInput,
): Promise<EnviarEmailCobroResult> {
  const data = EnviarEmailCobroSchema.parse(input);
  if (!smtpBreaker.allowRequest()) {
    throw new ServicioError(
      ErrorCode.DATABASE_ERROR,
      'SMTP temporalmente no disponible (circuit open).',
    );
  }
  const fromAddress = env.SMTP_FROM ?? env.SMTP_USER;
  if (!fromAddress) {
    throw errorValidacion('SMTP_FROM o SMTP_USER requerido');
  }

  const fromName = env.SMTP_FROM_NAME ?? 'Cobranza TicTac';
  const mailer = getTransporter();

  try {
    const info = await withRetry(
      () =>
        mailer.sendMail({
          from: `"${fromName}" <${fromAddress}>`,
          to: data.to,
          subject: data.subject,
          text: data.body,
          html: textoAHtml(data.body),
        }),
      { maxAttempts: 3, baseDelayMs: 500 },
    );
    smtpBreaker.recordSuccess();

    return {
      messageId: info.messageId ?? '',
      accepted: (info.accepted ?? []).map(String),
    };
  } catch (error) {
    smtpBreaker.recordFailure();
    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo enviar el correo de cobranza';
    throw new ServicioError(ErrorCode.DATABASE_ERROR, mensaje);
  }
}

export function construirAsuntoCobro(
  plantillaNombre: string | undefined,
  noPrestamo: string | undefined,
): string {
  if (plantillaNombre?.trim()) {
    return plantillaNombre.trim().slice(0, 200);
  }
  if (noPrestamo?.trim()) {
    return `Gestión de cobro - Préstamo ${noPrestamo.trim()}`.slice(0, 200);
  }
  return 'Gestión de cobro';
}

/**
 * Correo operativo interno (digests a supervisores/gerentes).
 * No exige idprestamo ni validación de deudor.
 */
export async function enviarEmailOperativo(
  input: EnviarEmailOperativoInput,
): Promise<EnviarEmailOperativoResult> {
  const data = EnviarEmailOperativoSchema.parse(input);
  if (!smtpBreaker.allowRequest()) {
    throw new ServicioError(
      ErrorCode.DATABASE_ERROR,
      'SMTP temporalmente no disponible (circuit open).',
    );
  }
  const fromAddress = env.SMTP_FROM ?? env.SMTP_USER;
  if (!fromAddress) {
    throw errorValidacion('SMTP_FROM o SMTP_USER requerido');
  }

  const fromName = env.SMTP_FROM_NAME ?? 'Cobranza TicTac';
  const mailer = getTransporter();

  try {
    const info = await withRetry(
      () =>
        mailer.sendMail({
          from: `"${fromName}" <${fromAddress}>`,
          to: data.to,
          subject: data.subject,
          text: data.body,
          html: textoAHtml(data.body),
        }),
      { maxAttempts: 3, baseDelayMs: 500 },
    );
    smtpBreaker.recordSuccess();

    return {
      messageId: info.messageId ?? '',
      accepted: (info.accepted ?? []).map(String),
    };
  } catch (error) {
    smtpBreaker.recordFailure();
    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo enviar el correo operativo';
    throw new ServicioError(ErrorCode.DATABASE_ERROR, mensaje);
  }
}
