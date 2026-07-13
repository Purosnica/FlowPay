import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { filtroMandante, requerirAccesoMandante } from './mandante-scope';
import { wherePrestamoPorRol } from './cobrador-scope';
import { decimalToNumber } from './decimal-utils';
import { nombreCompletoCliente } from '@/types/cobranza';

export interface PagoConciliacionItem {
  idpago: number;
  idprestamo: number;
  idmandante: number;
  noPrestamo: string;
  nombreCliente: string;
  fechaPago: Date;
  monto: number;
  moneda: string;
  medio: string | null;
  aplicado: boolean;
}

export interface PagosConciliacionPage {
  pagos: PagoConciliacionItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pendientesTotal: number;
}

export async function listarPagosConciliacion(
  idusuario: number,
  page: number,
  pageSize: number,
  options?: {
    idmandante?: number;
    soloPendientes?: boolean;
  },
): Promise<PagosConciliacionPage> {
  const idmandante = options?.idmandante;
  const soloPendientes = options?.soloPendientes ?? true;

  if (idmandante) {
    await requerirAccesoMandante(idusuario, idmandante);
  }

  const mandanteFilter: number | Prisma.IntFilter | undefined = idmandante
    ? idmandante
    : await filtroMandante(idusuario);

  const prestamoScope = await wherePrestamoPorRol(idusuario);

  const where: Prisma.tbl_pagoWhereInput = {
    deletedAt: null,
    idmandante: mandanteFilter,
    ...(soloPendientes ? { aplicado: false } : {}),
    prestamo: {
      deletedAt: null,
      ...prestamoScope,
    },
  };

  const skip = (page - 1) * pageSize;

  const [rows, total, pendientesTotal] = await Promise.all([
    prisma.tbl_pago.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { fechaPago: 'desc' },
      include: {
        prestamo: {
          include: { cliente: true },
        },
      },
    }),
    prisma.tbl_pago.count({ where }),
    prisma.tbl_pago.count({
      where: {
        deletedAt: null,
        idmandante: mandanteFilter,
        aplicado: false,
        prestamo: {
          deletedAt: null,
          ...prestamoScope,
        },
      },
    }),
  ]);

  const pagos: PagoConciliacionItem[] = rows.map((p) => ({
    idpago: p.idpago,
    idprestamo: p.idprestamo,
    idmandante: p.idmandante,
    noPrestamo: p.prestamo.noPrestamo,
    nombreCliente: p.prestamo.cliente
      ? nombreCompletoCliente(p.prestamo.cliente)
      : '—',
    fechaPago: p.fechaPago,
    monto: decimalToNumber(p.monto),
    moneda: p.moneda,
    medio: p.medio,
    aplicado: p.aplicado,
  }));

  return {
    pagos,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
    pendientesTotal,
  };
}
