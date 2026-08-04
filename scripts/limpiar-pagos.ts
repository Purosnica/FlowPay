/**
 * Vacía tbl_pago, reinicia AUTO_INCREMENT, revierte saldos aplicados
 * y elimina el log de importaciones de pagos (tbl_importacion_job).
 *
 * Uso:
 *   CONFIRM=LIMPIAR_PAGOS npx tsx scripts/limpiar-pagos.ts
 *
 * Windows PowerShell:
 *   $env:CONFIRM='LIMPIAR_PAGOS'; npx tsx scripts/limpiar-pagos.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { decimalToNumber } from '@/lib/cobranza/decimal-utils';
import { revertirPagoDelPrestamo } from '@/lib/cobranza/pago-aplicacion-service';

const CONFIRM_TOKEN = 'LIMPIAR_PAGOS';
const TX_TIMEOUT_MS = 60_000;
/** Jobs cuyo historial se borra junto con los pagos. */
const TIPOS_JOB_PAGO = ['PAGOS', 'COMPLETO'] as const;

async function main(): Promise<void> {
  if (process.env.CONFIRM !== CONFIRM_TOKEN) {
    // eslint-disable-next-line no-console -- script CLI
    console.error(
      `Abortado. Ejecuta con CONFIRM=${CONFIRM_TOKEN} para confirmar el vaciado.`,
    );
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    // eslint-disable-next-line no-console -- script CLI
    console.error('DATABASE_URL no definida.');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const [
      totalPagos,
      aplicados,
      detalles,
      cuotasConPago,
      jobsPago,
    ] = await Promise.all([
      prisma.tbl_pago.count(),
      prisma.tbl_pago.count({ where: { aplicado: true } }),
      prisma.tbl_liquidacion_detalle.count(),
      prisma.tbl_acuerdo_cuota.count({ where: { idpago: { not: null } } }),
      prisma.tbl_importacion_job.count({
        where: { tipo: { in: [...TIPOS_JOB_PAGO] } },
      }),
    ]);

    // eslint-disable-next-line no-console -- script CLI
    console.log(
      JSON.stringify(
        {
          antes: {
            totalPagos,
            aplicados,
            detalles,
            cuotasConPago,
            jobsImportacionPago: jobsPago,
          },
        },
        null,
        2,
      ),
    );

    const prestamosAfectados = new Set<number>();
    let revertidos = 0;

    const aplicadosList = await prisma.tbl_pago.findMany({
      where: { aplicado: true },
      select: {
        idpago: true,
        idprestamo: true,
        monto: true,
      },
      orderBy: { idpago: 'asc' },
    });

    for (const pago of aplicadosList) {
      await prisma.$transaction(
        async (tx) => {
          const monto = decimalToNumber(pago.monto);
          if (monto > 0) {
            await revertirPagoDelPrestamo(tx, {
              idprestamo: pago.idprestamo,
              monto,
              idpago: pago.idpago,
            });
          }
          await tx.tbl_pago.update({
            where: { idpago: pago.idpago },
            data: { aplicado: false },
          });
        },
        { timeout: TX_TIMEOUT_MS },
      );
      prestamosAfectados.add(pago.idprestamo);
      revertidos += 1;
      if (revertidos % 25 === 0) {
        // eslint-disable-next-line no-console -- script CLI
        console.log(
          JSON.stringify({ progreso: revertidos, total: aplicadosList.length }),
        );
      }
    }

    const idsPrestamo = [
      ...new Set([
        ...prestamosAfectados,
        ...(
          await prisma.tbl_pago.findMany({
            select: { idprestamo: true },
            distinct: ['idprestamo'],
          })
        ).map((p) => p.idprestamo),
      ]),
    ];

    await prisma.$transaction(async (tx) => {
      await tx.tbl_liquidacion_detalle.deleteMany({});
      // Soft-delete cabeceras para no dejar totales huérfanos / bloquear regeneración.
      await tx.tbl_liquidacion.updateMany({
        where: { deletedAt: null },
        data: {
          deletedAt: new Date(),
          periodoActivo: null,
          idempotencyKey: null,
        },
      });
      await tx.tbl_acuerdo_cuota.updateMany({
        where: { idpago: { not: null }, estado: 'PAGADA' },
        data: { idpago: null, estado: 'PENDIENTE' },
      });
      await tx.tbl_acuerdo_cuota.updateMany({
        where: { idpago: { not: null } },
        data: { idpago: null },
      });

      if (idsPrestamo.length > 0) {
        await tx.tbl_prestamo.updateMany({
          where: { idprestamo: { in: idsPrestamo } },
          data: { ultimaFechaPago: null },
        });
      }
    });

    // TRUNCATE hace commit implícito en MySQL; fuera de $transaction.
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE tbl_pago');
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

    const jobsABorrar = await prisma.tbl_importacion_job.findMany({
      where: { tipo: { in: [...TIPOS_JOB_PAGO] } },
      select: { idjob: true },
    });
    const idsJobs = jobsABorrar.map((j) => j.idjob);

    let auditoriaBorrada = 0;
    if (idsJobs.length > 0) {
      const audJobs = await prisma.tbl_auditoria.deleteMany({
        where: {
          entidad: 'tbl_importacion_job',
          entidadId: { in: idsJobs },
        },
      });
      auditoriaBorrada += audJobs.count;
    }
    const audForce = await prisma.tbl_auditoria.deleteMany({
      where: {
        entidad: 'importacion_cobranza',
        accion: { in: [...TIPOS_JOB_PAGO] },
      },
    });
    auditoriaBorrada += audForce.count;

    const jobsBorrados = await prisma.tbl_importacion_job.deleteMany({
      where: { tipo: { in: [...TIPOS_JOB_PAGO] } },
    });

    const [totalDespues, jobsDespues, autoIncRows] = await Promise.all([
      prisma.tbl_pago.count(),
      prisma.tbl_importacion_job.count({
        where: { tipo: { in: [...TIPOS_JOB_PAGO] } },
      }),
      prisma.$queryRaw<Array<{ Auto_increment: number | bigint | null }>>`
        SELECT AUTO_INCREMENT AS Auto_increment
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'tbl_pago'
      `,
    ]);

    // eslint-disable-next-line no-console -- script CLI
    console.log(
      JSON.stringify(
        {
          ok: true,
          revertidos,
          prestamosAfectados: idsPrestamo.length,
          jobsImportacionBorrados: jobsBorrados.count,
          auditoriaBorrada,
          despues: {
            totalPagos: totalDespues,
            jobsImportacionPago: jobsDespues,
            autoIncrement: Number(autoIncRows[0]?.Auto_increment ?? 1),
          },
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
