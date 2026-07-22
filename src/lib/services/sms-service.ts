/**
 * Encolar SMS de cobranza para el SMSGateway Android.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const SMS_ESTADO = {
  PENDIENTE: 'PENDIENTE',
  ENVIANDO: 'ENVIANDO',
  ENTREGADO: 'ENTREGADO',
  REBOTADO: 'REBOTADO',
} as const;

export type SmsEstado = (typeof SMS_ESTADO)[keyof typeof SMS_ESTADO];

export const EnviarSmsCobroSchema = z.object({
  telefono: z
    .string()
    .min(8, 'Teléfono del deudor inválido')
    .max(32, 'Teléfono demasiado largo'),
  mensaje: z
    .string()
    .min(1, 'Mensaje requerido')
    .max(1600, 'Mensaje demasiado largo'),
  idprestamo: z.number().int().positive('Préstamo requerido'),
  idplantilla: z.number().int().positive().optional(),
});

export type EnviarSmsCobroInput = z.infer<typeof EnviarSmsCobroSchema>;

export type EnviarSmsCobroResult = {
  idsms: number;
  estado: string;
};

export async function encolarSmsCobro(params: {
  input: EnviarSmsCobroInput;
  idmandante: number;
  idusuario: number;
  telefono: string;
}): Promise<EnviarSmsCobroResult> {
  const row = await prisma.tbl_envio_sms.create({
    data: {
      dispositivoId: 1,
      idprestamo: params.input.idprestamo,
      idmandante: params.idmandante,
      idusuario: params.idusuario,
      idplantilla: params.input.idplantilla,
      telefono: params.telefono,
      mensaje: params.input.mensaje,
      estado: SMS_ESTADO.PENDIENTE,
      campanaNombre: 'Cobro',
    },
    select: { idsms: true, estado: true },
  });

  return { idsms: row.idsms, estado: row.estado };
}
