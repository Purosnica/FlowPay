/**
 * Backfill: tbl_pago.diasMoraAplicacion desde tbl_prestamo_corte
 * (último corte con fechaCorte ≤ fechaPago; si no hay, mora del préstamo).
 *
 * Uso: npx tsx scripts/backfill-dias-mora-aplicacion.ts
 */

import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const pendientes = await prisma.tbl_pago.count({
      where: { deletedAt: null, diasMoraAplicacion: null },
    });

    const result = await prisma.$executeRaw`
      UPDATE tbl_pago p
      INNER JOIN tbl_prestamo pr ON pr.idprestamo = p.idprestamo
      SET p.diasMoraAplicacion = COALESCE(
        (
          SELECT c.diasMora
          FROM tbl_prestamo_corte c
          WHERE c.idprestamo = p.idprestamo
            AND c.fechaCorte <= p.fechaPago
          ORDER BY c.fechaCorte DESC
          LIMIT 1
        ),
        pr.diasMora
      )
      WHERE p.deletedAt IS NULL
        AND p.diasMoraAplicacion IS NULL
    `;

    // eslint-disable-next-line no-console -- script CLI
    console.log(
      JSON.stringify(
        { pendientesAntes: pendientes, filasActualizadas: result, ok: true },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
