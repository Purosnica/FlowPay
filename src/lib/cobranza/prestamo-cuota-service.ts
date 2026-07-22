/**
 * Cuotas de crédito (plan importado) — distintas de tbl_acuerdo_cuota (I031).
 */

import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { z } from 'zod';

export const UpsertPrestamoCuotasSchema = z.object({
  idprestamo: z.number().int().positive(),
  cuotas: z
    .array(
      z.object({
        numero: z.number().int().positive(),
        fechaVencimiento: z.coerce.date(),
        monto: z.number().positive(),
        saldo: z.number().min(0),
        estado: z
          .enum(['PENDIENTE', 'PAGADA', 'VENCIDA', 'ANULADA'])
          .default('PENDIENTE'),
      }),
    )
    .min(1)
    .max(360),
});

export type UpsertPrestamoCuotasInput = z.infer<
  typeof UpsertPrestamoCuotasSchema
>;

export async function upsertPrestamoCuotas(
  idusuario: number,
  input: UpsertPrestamoCuotasInput,
): Promise<{ creadas: number }> {
  const data = UpsertPrestamoCuotasSchema.parse(input);
  const prestamo = await prisma.tbl_prestamo.findFirst({
    where: { idprestamo: data.idprestamo, deletedAt: null },
    select: { idprestamo: true, idmandante: true },
  });
  if (!prestamo) {
    throw new GraphQLValidationError('Préstamo no encontrado.');
  }
  await requerirAccesoMandante(idusuario, prestamo.idmandante);

  await prisma.$transaction(async (tx) => {
    await tx.tbl_prestamo_cuota.updateMany({
      where: { idprestamo: data.idprestamo, deletedAt: null },
      data: { deletedAt: new Date(), estado: 'ANULADA' },
    });
    for (const c of data.cuotas) {
      await tx.tbl_prestamo_cuota.create({
        data: {
          idprestamo: data.idprestamo,
          numero: c.numero,
          fechaVencimiento: c.fechaVencimiento,
          monto: c.monto,
          saldo: c.saldo,
          estado: c.estado,
        },
      });
    }
  });

  return { creadas: data.cuotas.length };
}

export async function listarPrestamoCuotas(
  idusuario: number,
  idprestamo: number,
) {
  const prestamo = await prisma.tbl_prestamo.findFirst({
    where: { idprestamo, deletedAt: null },
    select: { idmandante: true },
  });
  if (!prestamo) {
    throw new GraphQLValidationError('Préstamo no encontrado.');
  }
  await requerirAccesoMandante(idusuario, prestamo.idmandante);
  return prisma.tbl_prestamo_cuota.findMany({
    where: { idprestamo, deletedAt: null },
    orderBy: { numero: 'asc' },
  });
}
