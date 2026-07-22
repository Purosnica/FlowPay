import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  obtenerConfigNumericaMandante,
  CLAVE_DIAS_MORA_CASTIGO,
} from './configuracion-cobranza-service';
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
  const prestamo = await db.tbl_prestamo.findUnique({
    where: { idprestamo },
    select: {
      estado: true,
      diasMora: true,
      saldoTotal: true,
      idmandante: true,
    },
  });
  if (!prestamo || Number(prestamo.saldoTotal) <= 0) {
    return false;
  }
  if (ESTADOS_EXCLUIDOS_CASTIGO.includes(prestamo.estado)) {
    return false;
  }

  const umbral = await obtenerConfigNumericaMandante(
    CLAVE_DIAS_MORA_CASTIGO,
    prestamo.idmandante,
  );
  if (umbral <= 0 || prestamo.diasMora < umbral) {
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
  const candidatos = await prisma.tbl_prestamo.findMany({
    where: {
      deletedAt: null,
      idmandante: idmandante ?? undefined,
      estado: { notIn: ESTADOS_EXCLUIDOS_CASTIGO },
      saldoTotal: { gt: 0 },
    },
    select: { idprestamo: true, idmandante: true, diasMora: true },
    take: 500,
    orderBy: { diasMora: 'desc' },
  });

  const umbralPorMandante = new Map<number, number>();
  let evaluados = 0;
  let castigados = 0;

  for (const c of candidatos) {
    let umbral = umbralPorMandante.get(c.idmandante);
    if (umbral === undefined) {
      umbral = await obtenerConfigNumericaMandante(
        CLAVE_DIAS_MORA_CASTIGO,
        c.idmandante,
      );
      umbralPorMandante.set(c.idmandante, umbral);
    }
    if (umbral <= 0 || c.diasMora < umbral) {
      continue;
    }
    evaluados++;
    const ok = await evaluarCastigoPrestamo(prisma, c.idprestamo);
    if (ok) {
      castigados++;
    }
  }

  return { evaluados, castigados };
}
