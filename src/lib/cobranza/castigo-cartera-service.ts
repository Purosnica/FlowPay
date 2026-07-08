import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { obtenerConfigNumerica, CLAVE_DIAS_MORA_CASTIGO } from './configuracion-cobranza-service';
import { transicionarEstadoPrestamo } from './estado-prestamo-service';

type Tx = Prisma.TransactionClient | typeof prisma;

const ESTADOS_EXCLUIDOS_CASTIGO = [
  'Castigo',
  'Cancelado',
  'Finalizado',
  'Con acuerdo',
];

export async function evaluarCastigoPrestamo(
  db: Tx,
  idprestamo: number,
  idusuario?: number | null,
): Promise<boolean> {
  const umbral = await obtenerConfigNumerica(CLAVE_DIAS_MORA_CASTIGO);
  if (umbral <= 0) {
    return false;
  }

  const prestamo = await db.tbl_prestamo.findUnique({
    where: { idprestamo },
    select: { estado: true, diasMora: true, saldoTotal: true },
  });
  if (!prestamo || Number(prestamo.saldoTotal) <= 0) {
    return false;
  }
  if (ESTADOS_EXCLUIDOS_CASTIGO.includes(prestamo.estado)) {
    return false;
  }
  if (prestamo.diasMora < umbral) {
    return false;
  }

  await transicionarEstadoPrestamo(db, {
    idprestamo,
    estadoNuevo: 'Castigo',
    idusuario,
    motivo: `Mora >= ${umbral} días — castigo automático`,
    forzar: true,
  });
  return true;
}

export async function procesarCastigoCartera(
  idmandante?: number,
): Promise<{ evaluados: number; castigados: number }> {
  const umbral = await obtenerConfigNumerica(CLAVE_DIAS_MORA_CASTIGO);
  if (umbral <= 0) {
    return { evaluados: 0, castigados: 0 };
  }

  const candidatos = await prisma.tbl_prestamo.findMany({
    where: {
      deletedAt: null,
      idmandante: idmandante ?? undefined,
      diasMora: { gte: umbral },
      estado: { notIn: ESTADOS_EXCLUIDOS_CASTIGO },
      saldoTotal: { gt: 0 },
    },
    select: { idprestamo: true },
    take: 500,
  });

  let castigados = 0;
  for (const c of candidatos) {
    const ok = await evaluarCastigoPrestamo(prisma, c.idprestamo);
    if (ok) {
      castigados++;
    }
  }

  return { evaluados: candidatos.length, castigados };
}
