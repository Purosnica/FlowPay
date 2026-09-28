import { prisma } from '@/lib/prisma';
import { validarSaldoPrestamo } from './ledger-financiero-service';

export type SeveridadIntegridad = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type HallazgoIntegridad = {
  codigo: string;
  severidad: SeveridadIntegridad;
  idprestamo?: number;
  detalle: string;
};

/** Solo lectura: detecta inconsistencias; nunca corrige datos automáticamente. */
export async function ejecutarChequeoIntegridadFinanciera(
  idmandante?: number,
): Promise<{ checked: number; passed: number; failed: number; findings: HallazgoIntegridad[] }> {
  const prestamos = await prisma.tbl_prestamo.findMany({
    where: { deletedAt: null, idmandante },
    select: { idprestamo: true, idmandante: true },
  });
  const findings: HallazgoIntegridad[] = [];
  for (const prestamo of prestamos) {
    const saldo = await validarSaldoPrestamo(prisma, prestamo.idprestamo);
    if (!saldo.ok) {
      findings.push({
        codigo: 'SALDO_LEDGER_DIFIERE', severidad: 'HIGH', idprestamo: prestamo.idprestamo,
        detalle: `Persistido=${saldo.saldoPersistido}; ledger=${saldo.saldoLedger}; diferencia=${saldo.diferencia}`,
      });
    }
  }
  const pagosSinMovimiento = await prisma.tbl_pago.findMany({
    where: {
      idmandante, aplicado: true, deletedAt: null,
      idpago: { notIn: (await prisma.tbl_movimiento_financiero.findMany({
        where: { tipoMovimiento: 'PAGO', idpago: { not: null } }, select: { idpago: true },
      })).flatMap((m) => m.idpago == null ? [] : [m.idpago]) },
    }, select: { idpago: true, idprestamo: true },
  });
  for (const pago of pagosSinMovimiento) {
    findings.push({ codigo: 'PAGO_SIN_LEDGER', severidad: 'HIGH', idprestamo: pago.idprestamo, detalle: `Pago aplicado ${pago.idpago} sin movimiento PAGO.` });
  }
  return { checked: prestamos.length, passed: prestamos.length - findings.filter((f) => f.codigo === 'SALDO_LEDGER_DIFIERE').length, failed: findings.length, findings };
}
