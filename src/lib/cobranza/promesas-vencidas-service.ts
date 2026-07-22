import { prisma } from '@/lib/prisma';
import { filtroMandante } from './mandante-scope';
import { decimalToNumber } from './decimal-utils';
import type { Prisma } from '@prisma/client';

import type { PromesaVencida } from '@/types/cobranza';
import { ESTADO_PROMESA } from '@/lib/logic/promesa-estado-logic';

export type PromesaVencidaGql = Omit<PromesaVencida, 'fechaPromesa'> & {
  fechaPromesa: Date;
};

function nombreCliente(row: {
  primer_nombres: string;
  segundo_nombres: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
}): string {
  return [
    row.primer_nombres,
    row.segundo_nombres,
    row.primer_apellido,
    row.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ');
}

const wherePromesaVencidaBase = (
  mandanteFilter: Prisma.IntFilter | undefined,
  hoy: Date,
  soloMisAsignados: boolean | undefined,
  idusuario: number,
): Prisma.tbl_gestionWhereInput => ({
  deletedAt: null,
  idmandante: mandanteFilter ?? { in: [] },
  fechaPromesa: { lt: hoy },
  montoPromesa: { not: null },
  NOT: { estadoPromesa: ESTADO_PROMESA.CUMPLIDA },
  OR: [
    { estadoPromesa: ESTADO_PROMESA.PENDIENTE },
    { estadoPromesa: ESTADO_PROMESA.VENCIDA },
    { estadoPromesa: null },
  ],
  prestamo: {
    deletedAt: null,
    estado: { not: 'Cancelado' },
    saldoTotal: { gt: 0 },
  },
  ...(soloMisAsignados
    ? {
        AND: [
          {
            OR: [
              { idgestor: idusuario },
              { prestamo: { idgestorAsignado: idusuario } },
            ],
          },
        ],
      }
    : {}),
});

export async function obtenerPromesasVencidas(
  idusuario: number,
  options?: { soloMisAsignados?: boolean; limit?: number },
): Promise<PromesaVencidaGql[]> {
  const mandanteFilter = await filtroMandante(idusuario);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const limit = options?.limit ?? 50;

  const gestiones = await prisma.tbl_gestion.findMany({
    where: wherePromesaVencidaBase(
      mandanteFilter,
      hoy,
      options?.soloMisAsignados,
      idusuario,
    ),
    orderBy: { fechaPromesa: 'asc' },
    take: limit,
    include: {
      prestamo: {
        include: {
          cliente: {
            select: {
              primer_nombres: true,
              segundo_nombres: true,
              primer_apellido: true,
              segundo_apellido: true,
            },
          },
        },
      },
    },
  });

  return gestiones.map((g) => {
    const fechaPromesa = g.fechaPromesa ?? hoy;
    const diffMs = hoy.getTime() - fechaPromesa.getTime();
    const diasVencidos = Math.max(1, Math.floor(diffMs / 86_400_000));

    return {
      idgestion: g.idgestion,
      idprestamo: g.idprestamo,
      noPrestamo: g.prestamo.noPrestamo,
      nombreCliente: g.prestamo.cliente
        ? nombreCliente(g.prestamo.cliente)
        : '—',
      montoPromesa: decimalToNumber(g.montoPromesa),
      fechaPromesa,
      diasVencidos,
    };
  });
}

export async function contarPromesasVencidas(
  idusuario: number,
  soloMisAsignados = false,
): Promise<number> {
  const mandanteFilter = await filtroMandante(idusuario);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return prisma.tbl_gestion.count({
    where: wherePromesaVencidaBase(
      mandanteFilter,
      hoy,
      soloMisAsignados,
      idusuario,
    ),
  });
}
