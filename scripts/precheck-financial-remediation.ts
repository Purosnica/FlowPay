import { prisma } from '../src/lib/prisma';

type Conteo = { total: number };

async function contar(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Conteo[]>(sql);
  return Number(rows[0]?.total ?? 0);
}

async function main(): Promise<void> {
  const checks = [
    ['pagos cross-tenant', 'SELECT COUNT(*) total FROM tbl_pago p JOIN tbl_prestamo pr ON pr.idprestamo=p.idprestamo WHERE p.idmandante<>pr.idmandante'],
    ['gestiones cross-tenant', 'SELECT COUNT(*) total FROM tbl_gestion g JOIN tbl_prestamo pr ON pr.idprestamo=g.idprestamo WHERE g.idmandante<>pr.idmandante'],
    ['acuerdos cross-tenant', 'SELECT COUNT(*) total FROM tbl_acuerdo a JOIN tbl_prestamo pr ON pr.idprestamo=a.idprestamo WHERE a.idmandante<>pr.idmandante'],
    ['ledger cross-tenant', 'SELECT COUNT(*) total FROM tbl_movimiento_financiero m JOIN tbl_prestamo pr ON pr.idprestamo=m.idprestamo WHERE m.idmandante<>pr.idmandante'],
    ['saldos negativos', 'SELECT COUNT(*) total FROM tbl_prestamo WHERE saldoTotal<0'],
  ] as const;
  let failed = 0;
  for (const [name, sql] of checks) {
    const total = await contar(sql);
    console.log(`${name}: ${total}`);
    if (total > 0) failed += 1;
  }
  if (failed > 0) process.exitCode = 2;
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
