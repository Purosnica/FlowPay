/**
 * Refinanciamiento de préstamo (I030): cierra origen y registra vínculo.
 */

import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { registrarAuditoria } from '@/lib/cobranza/auditoria-service';
import { transicionarEstadoPrestamo } from '@/lib/cobranza/estado-prestamo-service';
import { decimalToNumber } from '@/lib/cobranza/decimal-utils';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { z } from 'zod';

export const AplicarRefinanciamientoSchema = z.object({
  idprestamoOrigen: z.number().int().positive(),
  idprestamoNuevo: z.number().int().positive().optional(),
  motivo: z.string().max(2000).optional(),
});

export type AplicarRefinanciamientoInput = z.infer<
  typeof AplicarRefinanciamientoSchema
>;

export async function aplicarRefinanciamiento(
  idusuario: number,
  input: AplicarRefinanciamientoInput,
): Promise<{ idrefinanciamiento: number }> {
  const data = AplicarRefinanciamientoSchema.parse(input);

  const origen = await prisma.tbl_prestamo.findFirst({
    where: { idprestamo: data.idprestamoOrigen, deletedAt: null },
  });
  if (!origen) {
    throw new GraphQLValidationError('Préstamo origen no encontrado.');
  }
  await requerirAccesoMandante(idusuario, origen.idmandante);

  if (data.idprestamoNuevo != null) {
    const nuevo = await prisma.tbl_prestamo.findFirst({
      where: { idprestamo: data.idprestamoNuevo, deletedAt: null },
    });
    if (!nuevo || nuevo.idmandante !== origen.idmandante) {
      throw new GraphQLValidationError(
        'Préstamo nuevo inválido o de otro mandante.',
      );
    }
  }

  const idref = await prisma.$transaction(async (tx) => {
    await transicionarEstadoPrestamo(tx, {
      idprestamo: origen.idprestamo,
      estadoNuevo: 'Cancelado',
      idusuario,
      motivo: data.motivo ?? 'Refinanciamiento aplicado',
      forzar: true,
    });

    const row = await tx.tbl_refinanciamiento.create({
      data: {
        idmandante: origen.idmandante,
        idprestamoOrigen: origen.idprestamo,
        idprestamoNuevo: data.idprestamoNuevo ?? null,
        montoRefinanciado: origen.saldoTotal,
        estado: 'APLICADO',
        motivo: data.motivo ?? null,
        idusuario,
      },
    });

    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'tbl_refinanciamiento',
      entidadId: row.idrefinanciamiento,
      accion: 'APLICAR',
      detalle: JSON.stringify({
        origen: origen.idprestamo,
        nuevo: data.idprestamoNuevo ?? null,
        monto: decimalToNumber(origen.saldoTotal),
      }),
    });

    return row.idrefinanciamiento;
  });

  return { idrefinanciamiento: idref };
}
