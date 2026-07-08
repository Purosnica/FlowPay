import { prisma } from '@/lib/prisma';
import { registrarAuditoria } from './auditoria-service';

export interface ResultadoEscalamientoSla {
  reclamosEscalados: number;
  ids: number[];
}

export async function escalarReclamosFueraSla(): Promise<ResultadoEscalamientoSla> {
  const ahora = new Date();
  const fueraSla = await prisma.tbl_reclamo.findMany({
    where: {
      deletedAt: null,
      estado: { in: ['ABIERTO', 'EN_PROCESO'] },
      fechaLimite: { lt: ahora },
    },
    select: { idreclamo: true, estado: true },
    take: 200,
  });

  const ids: number[] = [];
  for (const r of fueraSla) {
    if (r.estado === 'ABIERTO') {
      await prisma.$transaction(async (tx) => {
        await tx.tbl_reclamo.update({
          where: { idreclamo: r.idreclamo },
          data: { estado: 'EN_PROCESO' },
        });
        await registrarAuditoria(tx, {
          entidad: 'tbl_reclamo',
          entidadId: r.idreclamo,
          accion: 'ESCALAMIENTO_SLA',
          detalle: JSON.stringify({ motivo: 'Fecha límite SLA vencida' }),
        });
      });
      ids.push(r.idreclamo);
    }
  }

  return { reclamosEscalados: ids.length, ids };
}

export async function contarReclamosFueraSla(idmandante?: number): Promise<number> {
  return prisma.tbl_reclamo.count({
    where: {
      deletedAt: null,
      idmandante: idmandante ?? undefined,
      estado: { in: ['ABIERTO', 'EN_PROCESO'] },
      fechaLimite: { lt: new Date() },
    },
  });
}
