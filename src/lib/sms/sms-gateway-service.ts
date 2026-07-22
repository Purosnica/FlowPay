/**
 * Operaciones del SMSGateway Android: cola, status, recibidos, stats.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { SMS_ESTADO } from '@/lib/services/sms-service';
import { errorValidacion } from '@/lib/services/error-types';

const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const BATCH_CLAIM_LIMIT = 10;

export const SmsStatusSchema = z.object({
  sms_id: z.number().int().positive(),
  estado: z.enum(['entregado', 'rebotado']),
  error_detalle: z.string().max(2000).nullable().optional(),
});

export type SmsStatusInput = z.infer<typeof SmsStatusSchema>;

export const SmsRecibidoSchema = z.object({
  telefono: z.string().min(1).max(32),
  mensaje: z.string().min(1).max(5000),
});

export type SmsRecibidoInput = z.infer<typeof SmsRecibidoSchema>;

export type SmsPendienteItem = {
  id: number;
  telefono: string;
  mensaje: string;
};

export type SmsPendientesResult = {
  mensajes: SmsPendienteItem[];
  campana_nombre: string | null;
};

function parseDispositivoId(raw: string | null): number {
  if (!raw) {
    return 1;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw errorValidacion('dispositivo_id inválido');
  }
  return n;
}

export async function claimSmsPendientes(params: {
  dispositivoIdRaw: string | null;
}): Promise<SmsPendientesResult> {
  const dispositivoId = parseDispositivoId(params.dispositivoIdRaw);
  const ahora = new Date();
  const claimCutoff = new Date(ahora.getTime() - CLAIM_TIMEOUT_MS);

  const candidatos = await prisma.tbl_envio_sms.findMany({
    where: {
      dispositivoId,
      OR: [
        { estado: SMS_ESTADO.PENDIENTE },
        {
          estado: SMS_ESTADO.ENVIANDO,
          claimedAt: { lt: claimCutoff },
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: BATCH_CLAIM_LIMIT,
    select: {
      idsms: true,
      telefono: true,
      mensaje: true,
      campanaNombre: true,
    },
  });

  if (candidatos.length === 0) {
    return { mensajes: [], campana_nombre: null };
  }

  const ids = candidatos.map((c) => c.idsms);
  await prisma.tbl_envio_sms.updateMany({
    where: { idsms: { in: ids } },
    data: {
      estado: SMS_ESTADO.ENVIANDO,
      claimedAt: ahora,
    },
  });

  const campanaNombre =
    candidatos.find((c) => c.campanaNombre?.trim())?.campanaNombre ?? null;

  return {
    mensajes: candidatos.map((c) => ({
      id: c.idsms,
      telefono: c.telefono,
      mensaje: c.mensaje,
    })),
    campana_nombre: campanaNombre,
  };
}

export async function actualizarSmsStatus(
  input: SmsStatusInput,
): Promise<void> {
  const existente = await prisma.tbl_envio_sms.findUnique({
    where: { idsms: input.sms_id },
    select: { idsms: true, estado: true },
  });

  if (!existente) {
    throw errorValidacion('sms_id no encontrado');
  }

  const estadoDb =
    input.estado === 'entregado'
      ? SMS_ESTADO.ENTREGADO
      : SMS_ESTADO.REBOTADO;

  await prisma.tbl_envio_sms.update({
    where: { idsms: input.sms_id },
    data: {
      estado: estadoDb,
      errorDetalle:
        input.estado === 'rebotado'
          ? (input.error_detalle ?? null)
          : null,
      enviadoAt: new Date(),
    },
  });
}

export async function registrarSmsRecibido(
  input: SmsRecibidoInput,
  dispositivoId = 1,
): Promise<{ idrecibido: number }> {
  const row = await prisma.tbl_sms_recibido.create({
    data: {
      dispositivoId,
      telefono: input.telefono.trim(),
      mensaje: input.mensaje,
    },
    select: { idrecibido: true },
  });
  return { idrecibido: row.idrecibido };
}

export async function obtenerSmsDashboardStats(): Promise<{
  pendientes: number;
  enviando: number;
  campana_nombre: string | null;
}> {
  const [pendientes, enviando, reciente] = await Promise.all([
    prisma.tbl_envio_sms.count({
      where: { estado: SMS_ESTADO.PENDIENTE },
    }),
    prisma.tbl_envio_sms.count({
      where: { estado: SMS_ESTADO.ENVIANDO },
    }),
    prisma.tbl_envio_sms.findFirst({
      where: {
        estado: { in: [SMS_ESTADO.PENDIENTE, SMS_ESTADO.ENVIANDO] },
        campanaNombre: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: { campanaNombre: true },
    }),
  ]);

  return {
    pendientes,
    enviando,
    campana_nombre: reciente?.campanaNombre ?? null,
  };
}
