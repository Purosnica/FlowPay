import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decimalToNumber } from './decimal-utils';
import { registrarAuditoria } from './auditoria-service';

type Tx = Prisma.TransactionClient;

export interface ResultadoProcesarPromesas {
  evaluadas: number;
  cumplidas: number;
  vencidas: number;
}

export async function evaluarPromesaPorPago(
  tx: Tx,
  params: {
    idprestamo: number;
    montoPago: number;
    fechaPago: Date;
    idusuario?: number | null;
  },
): Promise<void> {
  const gestionesConPromesa = await tx.tbl_gestion.findMany({
    where: {
      idprestamo: params.idprestamo,
      deletedAt: null,
      montoPromesa: { not: null },
      fechaPromesa: { not: null },
      nota: { not: { contains: '[PROMESA_CUMPLIDA]' } },
    },
    orderBy: { fechaGestion: 'desc' },
    take: 5,
  });

  for (const g of gestionesConPromesa) {
    const montoPromesa = decimalToNumber(g.montoPromesa);
    const fechaPromesa = g.fechaPromesa;
    if (!fechaPromesa || montoPromesa <= 0) {
      continue;
    }

    const finPromesa = new Date(fechaPromesa);
    finPromesa.setHours(23, 59, 59, 999);

    if (params.fechaPago <= finPromesa && params.montoPago >= montoPromesa * 0.99) {
      await tx.tbl_gestion.update({
        where: { idgestion: g.idgestion },
        data: {
          nota: `${g.nota}\n[PROMESA_CUMPLIDA] Pago registrado el ${params.fechaPago.toISOString().slice(0, 10)}.`,
        },
      });
      await registrarAuditoria(tx, {
        idusuario: params.idusuario,
        entidad: 'tbl_gestion',
        entidadId: g.idgestion,
        accion: 'PROMESA_CUMPLIDA',
        detalle: JSON.stringify({ montoPago: params.montoPago, montoPromesa }),
      });
      break;
    }
  }
}

export async function procesarPromesasVencidas(
  idusuario?: number | null,
): Promise<ResultadoProcesarPromesas> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const promesasVencidas = await prisma.tbl_gestion.findMany({
    where: {
      deletedAt: null,
      fechaPromesa: { lt: hoy },
      montoPromesa: { not: null },
      nota: { not: { contains: '[PROMESA_CUMPLIDA]' } },
      prestamo: {
        deletedAt: null,
        estado: { notIn: ['Cancelado', 'Finalizado'] },
        saldoTotal: { gt: 0 },
      },
    },
    select: { idgestion: true, nota: true },
  });

  let marcadas = 0;
  for (const g of promesasVencidas) {
    if (g.nota.includes('[PROMESA_VENCIDA]')) {
      continue;
    }
    await prisma.tbl_gestion.update({
      where: { idgestion: g.idgestion },
      data: {
        nota: `${g.nota}\n[PROMESA_VENCIDA] Sin cumplimiento a la fecha acordada.`,
      },
    });
    marcadas++;
  }

  if (marcadas > 0) {
    await registrarAuditoria(prisma, {
      idusuario,
      entidad: 'tbl_gestion',
      entidadId: 0,
      accion: 'PROCESAR_PROMESAS_VENCIDAS',
      detalle: JSON.stringify({ marcadas }),
    });
  }

  const cumplidas = await prisma.tbl_gestion.count({
    where: {
      deletedAt: null,
      nota: { contains: '[PROMESA_CUMPLIDA]' },
      fechaGestion: { gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1) },
    },
  });

  return {
    evaluadas: promesasVencidas.length,
    cumplidas,
    vencidas: marcadas,
  };
}
