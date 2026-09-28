import { prisma } from '../src/lib/prisma';
import { decimalToNumber } from '../src/lib/cobranza/decimal-utils';

const dryRun = process.argv.includes('--dry-run');

async function main(): Promise<void> {
  const prestamos = await prisma.tbl_prestamo.findMany({
    where: { deletedAt: null, movimientosFinancieros: { none: {} } },
    select: {
      idprestamo: true, idmandante: true, idcliente: true, moneda: true, saldoTotal: true,
    },
  });
  console.log(`Préstamos revisados sin ledger: ${prestamos.length}`);
  console.log(`Modo: ${dryRun ? 'DRY RUN (sin cambios)' : 'APLICAR'}`);
  if (dryRun) return;

  for (const prestamo of prestamos) {
    const saldo = decimalToNumber(prestamo.saldoTotal);
    await prisma.tbl_movimiento_financiero.create({
      data: {
        idmandante: prestamo.idmandante,
        idprestamo: prestamo.idprestamo,
        idcliente: prestamo.idcliente,
        tipoMovimiento: 'SALDO_INICIAL_MIGRADO',
        monto: saldo,
        moneda: prestamo.moneda,
        montoBase: saldo,
        monedaBase: prestamo.moneda,
        impactoSaldo: saldo,
        saldoAnterior: 0,
        saldoPosterior: saldo,
        fechaOperacion: new Date(),
        motivo: 'Backfill aditivo: saldo vigente al iniciar ledger',
        metadata: JSON.stringify({ fuente: 'tbl_prestamo.saldoTotal', migrado: true }),
      },
    });
  }
  console.log(`Movimientos iniciales creados: ${prestamos.length}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
