/**
 * Integración T-02: createPago (vía Prisma+servicios) → anular.
 * Requiere DATABASE_URL y al menos un préstamo con saldo > 0.
 *
 * Uso: npm run test:pago-integration
 * Sale 0 si OK o skip controlado; 1 si falla la transacción.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { crearIdempotencyKey } from '@/lib/api/idempotency-key';
import { anularPagoEnTransaccion } from '@/lib/cobranza/pago-anulacion-service';
import {
  folioComprobantePago,
  rutaComprobantePago,
} from '@/lib/logic/comprobante-pago-logic';
import { decimalToNumber } from '@/lib/cobranza/decimal-utils';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn('SKIP test:pago-integration — DATABASE_URL no definida');
    return;
  }

  const cobrador = await prisma.tbl_usuario.findFirst({
    where: {
      email: 'cobrador@flowpay.com',
      activo: true,
      deletedAt: null,
    },
    select: { idusuario: true },
  });
  if (!cobrador) {
    console.warn('SKIP test:pago-integration — falta cobrador@flowpay.com');
    return;
  }

  const prestamo = await prisma.tbl_prestamo.findFirst({
    where: {
      deletedAt: null,
      saldoTotal: { gt: 0 },
    },
    orderBy: { idprestamo: 'asc' },
    select: {
      idprestamo: true,
      idmandante: true,
      saldoTotal: true,
      moneda: true,
    },
  });
  if (!prestamo) {
    console.warn('SKIP test:pago-integration — no hay préstamo con saldo');
    return;
  }

  const monto = Math.min(1, decimalToNumber(prestamo.saldoTotal));
  const idempotencyKey = crearIdempotencyKey('tint');
  const fechaPago = new Date();

  const idpago = await prisma.$transaction(async (tx) => {
    const created = await tx.tbl_pago.create({
      data: {
        idmandante: prestamo.idmandante,
        idprestamo: prestamo.idprestamo,
        idgestor: cobrador.idusuario,
        fechaPago,
        monto,
        moneda: prestamo.moneda === 'USD' ? 'USD' : 'NIO',
        medio: 'EFECTIVO',
        idempotencyKey,
        aplicado: false,
      },
    });

    await tx.tbl_pago.update({
      where: { idpago: created.idpago },
      data: {
        reciboUrl: rutaComprobantePago(created.idpago),
        folio: folioComprobantePago(created.idpago),
      },
    });

    const dup = await tx.tbl_pago.findFirst({
      where: {
        idgestor: cobrador.idusuario,
        idempotencyKey,
        deletedAt: null,
      },
    });
    if (!dup || dup.idpago !== created.idpago) {
      throw new Error('Idempotencia createPago falló');
    }

    const pagoAnular = await tx.tbl_pago.findUniqueOrThrow({
      where: { idpago: created.idpago },
      include: {
        liquidacionDetalles: {
          include: { liquidacion: { select: { estado: true } } },
        },
      },
    });

    await anularPagoEnTransaccion(tx, pagoAnular, cobrador.idusuario);

    const anulado = await tx.tbl_pago.findUniqueOrThrow({
      where: { idpago: created.idpago },
    });
    if (!anulado.deletedAt) {
      throw new Error('Anulación no marcó deletedAt');
    }

    return created.idpago;
  });

  console.warn(
    `test:pago-integration OK — idpago=${idpago} prestamo=${prestamo.idprestamo} monto=${monto}`,
  );
}

main()
  .catch((err) => {
    console.error(
      'test:pago-integration FAIL',
      err instanceof Error ? err.message : err,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
