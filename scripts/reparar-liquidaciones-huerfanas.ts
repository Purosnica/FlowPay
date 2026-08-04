/**
 * Repara liquidaciones huérfanas tras wipe de pagos:
 * anula cabeceras sin detalle y regenera periodos con pagos aplicados.
 *
 * Uso: npx tsx scripts/reparar-liquidaciones-huerfanas.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { generarLiquidacion } from '@/lib/cobranza/liquidacion-service';
import { parsePeriodo } from '@/lib/cobranza/periodo-utils';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.tbl_usuario.findFirst({
      where: {
        email: 'admin@flowpay.com',
        activo: true,
        deletedAt: null,
      },
      select: { idusuario: true },
    });
    if (!admin) {
      throw new Error('No se encontró admin@flowpay.com');
    }

    const activas = await prisma.tbl_liquidacion.findMany({
      where: { deletedAt: null },
      select: {
        idliquidacion: true,
        idmandante: true,
        periodo: true,
        estado: true,
        _count: { select: { detalle: true } },
      },
    });

    const huerfanas = activas.filter((l) => l._count.detalle === 0);
    if (huerfanas.length > 0) {
      await prisma.tbl_liquidacion.updateMany({
        where: {
          idliquidacion: { in: huerfanas.map((h) => h.idliquidacion) },
        },
        data: {
          deletedAt: new Date(),
          periodoActivo: null,
          idempotencyKey: null,
        },
      });
    }

    const porMes = await prisma.$queryRaw<
      Array<{ idmandante: number; ym: string; cantidad: bigint }>
    >`
      SELECT idmandante,
             DATE_FORMAT(fechaPago, '%Y-%m') AS ym,
             COUNT(*) AS cantidad
      FROM tbl_pago
      WHERE deletedAt IS NULL AND aplicado = 1
      GROUP BY idmandante, DATE_FORMAT(fechaPago, '%Y-%m')
      ORDER BY ym ASC
    `;

    const regeneradas: Array<{
      periodo: string;
      idmandante: number;
      idliquidacion: number;
      cantidadPagos: number;
      totalRecuperado: number;
    }> = [];

    for (const row of porMes) {
      const periodo = String(row.ym);
      // Validar formato vía parsePeriodo
      parsePeriodo(periodo);
      if (Number(row.cantidad) === 0) {
        continue;
      }
      const result = await generarLiquidacion({
        idmandante: row.idmandante,
        periodo,
        idusuario: admin.idusuario,
      });
      regeneradas.push({
        periodo,
        idmandante: row.idmandante,
        idliquidacion: result.idliquidacion,
        cantidadPagos: result.simulacion.cantidadPagos,
        totalRecuperado: result.simulacion.totalRecuperado,
      });
    }

    // eslint-disable-next-line no-console -- script CLI
    console.log(
      JSON.stringify(
        {
          ok: true,
          huerfanasAnuladas: huerfanas.length,
          regeneradas,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err: unknown) => {
  // eslint-disable-next-line no-console -- script CLI
  console.error(err);
  process.exit(1);
});
