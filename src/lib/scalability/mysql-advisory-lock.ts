import { PrismaClient } from '@prisma/client';

type LockRow = { locked: number | bigint | null };

function lockAdquirido(valor: number | bigint | null | undefined): boolean {
  return Number(valor) === 1;
}

/**
 * Cliente Prisma dedicado (connection_limit=1) para GET_LOCK/RELEASE_LOCK.
 * Los advisory locks de MySQL son por conexión; el pool compartido puede
 * adquirir en A y liberar en B. Este cliente fuerza la misma conexión.
 */
let lockClient: PrismaClient | null = null;

function buildLockDatabaseUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('connection_limit', '1');
    return url.toString();
  } catch {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}connection_limit=1`;
  }
}

function getLockPrisma(): PrismaClient {
  if (lockClient) {
    return lockClient;
  }
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error(
      'DATABASE_URL es requerido para advisory locks MySQL.',
    );
  }
  lockClient = new PrismaClient({
    datasources: { db: { url: buildLockDatabaseUrl(baseUrl) } },
    log: ['error'],
  });
  return lockClient;
}

/** Solo tests: libera el singleton del cliente de locks. */
export async function resetLockPrismaForTests(): Promise<void> {
  if (lockClient) {
    await lockClient.$disconnect();
    lockClient = null;
  }
}

/**
 * Bloqueo distribuido vía MySQL GET_LOCK (multi-instancia, afinidad estable).
 */
export async function adquirirBloqueoMysql(
  nombre: string,
  timeoutSec = 0,
): Promise<boolean> {
  const client = getLockPrisma();
  const rows = await client.$queryRaw<LockRow[]>`
    SELECT GET_LOCK(${nombre}, ${timeoutSec}) AS locked
  `;
  return lockAdquirido(rows[0]?.locked);
}

export async function liberarBloqueoMysql(nombre: string): Promise<void> {
  const client = getLockPrisma();
  await client.$queryRaw`SELECT RELEASE_LOCK(${nombre})`;
}
