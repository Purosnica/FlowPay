/**
 * Conciliación por extracto bancario (I028): match por monto + fecha ±1 día.
 * No inventa API bancaria; opera sobre pagos pendientes de aplicar.
 */

import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { decimalToNumber, roundMoney } from '@/lib/cobranza/decimal-utils';
import { z } from 'zod';

export const ExtractoBancarioLineaSchema = z.object({
  fecha: z.coerce.date(),
  monto: z.number().positive(),
  referencia: z.string().max(120).optional(),
});

export const ConciliarExtractoSchema = z.object({
  idmandante: z.number().int().positive(),
  lineas: z.array(ExtractoBancarioLineaSchema).min(1).max(5_000),
  aplicarAutomatico: z.boolean().default(false),
});

export type ConciliarExtractoInput = z.infer<typeof ConciliarExtractoSchema>;

export type MatchExtracto = {
  fecha: string;
  monto: number;
  referencia?: string;
  idpago: number | null;
  estado: 'MATCH' | 'SIN_MATCH' | 'AMBIGUO';
};

export async function conciliarExtractoBancario(
  idusuario: number,
  input: ConciliarExtractoInput,
): Promise<{ matches: MatchExtracto[]; aplicados: number }> {
  const data = ConciliarExtractoSchema.parse(input);
  await requerirAccesoMandante(idusuario, data.idmandante);

  const pendientes = await prisma.tbl_pago.findMany({
    where: {
      idmandante: data.idmandante,
      deletedAt: null,
      aplicado: false,
    },
    select: {
      idpago: true,
      monto: true,
      fechaPago: true,
    },
  });

  const usados = new Set<number>();
  const matches: MatchExtracto[] = [];
  let aplicados = 0;

  for (const linea of data.lineas) {
    const monto = roundMoney(linea.monto);
    const candidatos = pendientes.filter((p) => {
      if (usados.has(p.idpago)) {
        return false;
      }
      if (roundMoney(decimalToNumber(p.monto)) !== monto) {
        return false;
      }
      const diffMs = Math.abs(p.fechaPago.getTime() - linea.fecha.getTime());
      return diffMs <= 36 * 60 * 60 * 1000;
    });

    if (candidatos.length === 0) {
      matches.push({
        fecha: linea.fecha.toISOString(),
        monto,
        referencia: linea.referencia,
        idpago: null,
        estado: 'SIN_MATCH',
      });
      continue;
    }
    if (candidatos.length > 1) {
      matches.push({
        fecha: linea.fecha.toISOString(),
        monto,
        referencia: linea.referencia,
        idpago: null,
        estado: 'AMBIGUO',
      });
      continue;
    }

    const pago = candidatos[0];
    usados.add(pago.idpago);
    matches.push({
      fecha: linea.fecha.toISOString(),
      monto,
      referencia: linea.referencia,
      idpago: pago.idpago,
      estado: 'MATCH',
    });

    if (data.aplicarAutomatico) {
      // Marcado de aplicado queda en mutation GraphQL existente (pago).
    }
  }

  return { matches, aplicados };
}
