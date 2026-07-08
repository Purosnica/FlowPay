import { prisma } from '@/lib/prisma';

type LockRow = { locked: number | bigint | null };

function lockAdquirido(valor: number | bigint | null | undefined): boolean {
  return Number(valor) === 1;
}

/**
 * Bloqueo distribuido vía MySQL GET_LOCK (compatible multi-instancia).
 */
export async function adquirirBloqueoMysql(
  nombre: string,
  timeoutSec = 0,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<LockRow[]>`
    SELECT GET_LOCK(${nombre}, ${timeoutSec}) AS locked
  `;
  return lockAdquirido(rows[0]?.locked);
}

export async function liberarBloqueoMysql(nombre: string): Promise<void> {
  await prisma.$queryRaw`SELECT RELEASE_LOCK(${nombre})`;
}
