import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decimalToNumber } from './decimal-utils';
import { registrarAuditoria } from './auditoria-service';
import { inicioPeriodoActual } from './periodo-utils';
import {
  ESTADO_PROMESA,
  promesaCumplidaPorMonto,
} from '@/lib/logic/promesa-estado-logic';

type Tx = Prisma.TransactionClient;

export interface ResultadoProcesarPromesas {
  evaluadas: number;
  cumplidas: number;
  vencidas: number;
}

const wherePromesaEstadoAbierto: Prisma.tbl_gestionWhereInput = {
  OR: [
    { estadoPromesa: ESTADO_PROMESA.PENDIENTE },
    { estadoPromesa: null },
  ],
};

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
      ...wherePromesaEstadoAbierto,
    },
    orderBy: { fechaGestion: 'desc' },
    take: 10,
  });

  for (const g of gestionesConPromesa) {
    const montoPromesa = decimalToNumber(g.montoPromesa);
    const fechaPromesa = g.fechaPromesa;
    if (!fechaPromesa || montoPromesa <= 0) {
      continue;
    }

    const finPromesa = new Date(fechaPromesa);
    finPromesa.setHours(23, 59, 59, 999);
    if (params.fechaPago > finPromesa) {
      continue;
    }

    const pagosAgg = await tx.tbl_pago.aggregate({
      where: {
        idprestamo: params.idprestamo,
        aplicado: true,
        deletedAt: null,
        fechaPago: { lte: finPromesa },
        createdAt: { gte: g.fechaGestion },
      },
      _sum: { monto: true },
    });
    const acumulado = decimalToNumber(pagosAgg._sum.monto);

    if (
      !promesaCumplidaPorMonto({
        montoPromesa,
        montoAcumuladoPagos: acumulado,
      })
    ) {
      continue;
    }

    await tx.tbl_gestion.update({
      where: { idgestion: g.idgestion },
      data: {
        estadoPromesa: ESTADO_PROMESA.CUMPLIDA,
      },
    });
    await registrarAuditoria(tx, {
      idusuario: params.idusuario,
      entidad: 'tbl_gestion',
      entidadId: g.idgestion,
      accion: 'PROMESA_CUMPLIDA',
      detalle: JSON.stringify({
        montoAcumulado: acumulado,
        montoPromesa,
      }),
    });
    break;
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
      ...wherePromesaEstadoAbierto,
      prestamo: {
        deletedAt: null,
        estado: { notIn: ['Cancelado', 'Finalizado'] },
        saldoTotal: { gt: 0 },
      },
    },
    select: { idgestion: true, estadoPromesa: true },
  });

  let marcadas = 0;
  for (const g of promesasVencidas) {
    if (g.estadoPromesa === ESTADO_PROMESA.VENCIDA) {
      continue;
    }
    await prisma.tbl_gestion.update({
      where: { idgestion: g.idgestion },
      data: {
        estadoPromesa: ESTADO_PROMESA.VENCIDA,
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
      estadoPromesa: ESTADO_PROMESA.CUMPLIDA,
      fechaGestion: { gte: inicioPeriodoActual() },
    },
  });

  return {
    evaluadas: promesasVencidas.length,
    cumplidas,
    vencidas: marcadas,
  };
}
