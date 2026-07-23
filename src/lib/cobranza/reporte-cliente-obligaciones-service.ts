import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { filtroMandante } from './mandante-scope';
import { wherePrestamoPorRol } from './cobrador-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import type {
  ReporteClienteMandanteResumen,
  ReporteClienteObligacionItem,
  ReporteClienteObligaciones,
  ReporteClienteObligacionesCliente,
} from '@/types/cobranza';

const ESTADOS_SIN_DEUDA = ['Cancelado', 'Finalizado'] as const;
const MAX_CLIENTES = 500;

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

export interface FiltrosReporteClienteObligaciones {
  /** Mínimo de mandantes con deuda activa (N). Default 1. */
  minMandantes?: number | null;
  /** Buscar por documento o nombre. */
  search?: string | null;
  /** Detalle de un cliente concreto. */
  idcliente?: number | null;
}

/**
 * Obligaciones activas de clientes por mandante (scope multi-mandante).
 * Indica si el cliente tiene deuda con N mandantes.
 */
export async function obtenerReporteClienteObligaciones(
  idusuario: number,
  filtros: FiltrosReporteClienteObligaciones = {},
): Promise<ReporteClienteObligaciones> {
  const minMandantesRaw = filtros.minMandantes ?? 1;
  const minMandantes =
    Number.isInteger(minMandantesRaw) && minMandantesRaw > 0
      ? Math.min(minMandantesRaw, 50)
      : 1;

  const mandanteFilter = await filtroMandante(idusuario);
  const rolFilter = await wherePrestamoPorRol(idusuario);

  const where: Prisma.tbl_prestamoWhereInput = {
    deletedAt: null,
    saldoTotal: { gt: 0 },
    estado: { notIn: [...ESTADOS_SIN_DEUDA] },
    idmandante: mandanteFilter,
    ...rolFilter,
  };

  if (filtros.idcliente != null && filtros.idcliente > 0) {
    where.idcliente = filtros.idcliente;
  }

  const search = filtros.search?.trim();
  if (search && !(filtros.idcliente != null && filtros.idcliente > 0)) {
    where.cliente = {
      OR: [
        { numerodocumento: { contains: search } },
        { primer_nombres: { contains: search } },
        { segundo_nombres: { contains: search } },
        { primer_apellido: { contains: search } },
        { segundo_apellido: { contains: search } },
      ],
    };
  }

  const prestamos = await prisma.tbl_prestamo.findMany({
    where,
    select: {
      idprestamo: true,
      idcliente: true,
      idmandante: true,
      noPrestamo: true,
      estado: true,
      saldoTotal: true,
      diasMora: true,
      moneda: true,
      cliente: {
        select: {
          idcliente: true,
          primer_nombres: true,
          segundo_nombres: true,
          primer_apellido: true,
          segundo_apellido: true,
          numerodocumento: true,
        },
      },
      mandante: {
        select: {
          idmandante: true,
          codigo: true,
          nombre: true,
        },
      },
    },
    orderBy: [{ saldoTotal: 'desc' }],
  });

  type AccCliente = {
    idcliente: number;
    nombreCliente: string;
    numerodocumento: string;
    saldoTotal: number;
    maxDiasMora: number;
    obligaciones: ReporteClienteObligacionItem[];
    porMandante: Map<
      number,
      {
        codigo: string;
        nombre: string;
        cantidadPrestamos: number;
        saldoTotal: number;
        maxDiasMora: number;
      }
    >;
  };

  const porCliente = new Map<number, AccCliente>();

  for (const p of prestamos) {
    const saldo = decimalToNumber(p.saldoTotal);
    const acc: AccCliente = porCliente.get(p.idcliente) ?? {
      idcliente: p.idcliente,
      nombreCliente: p.cliente
        ? nombreCliente(p.cliente)
        : `Cliente #${p.idcliente}`,
      numerodocumento: p.cliente?.numerodocumento ?? '',
      saldoTotal: 0,
      maxDiasMora: 0,
      obligaciones: [] as ReporteClienteObligacionItem[],
      porMandante: new Map(),
    };

    acc.saldoTotal += saldo;
    acc.maxDiasMora = Math.max(acc.maxDiasMora, p.diasMora);
    acc.obligaciones.push({
      idprestamo: p.idprestamo,
      noPrestamo: p.noPrestamo,
      idmandante: p.idmandante,
      mandanteCodigo: p.mandante.codigo,
      mandanteNombre: p.mandante.nombre,
      estado: p.estado,
      saldoTotal: roundMoney(saldo),
      diasMora: p.diasMora,
      moneda: p.moneda,
    });

    const m = acc.porMandante.get(p.idmandante) ?? {
      codigo: p.mandante.codigo,
      nombre: p.mandante.nombre,
      cantidadPrestamos: 0,
      saldoTotal: 0,
      maxDiasMora: 0,
    };
    m.cantidadPrestamos += 1;
    m.saldoTotal += saldo;
    m.maxDiasMora = Math.max(m.maxDiasMora, p.diasMora);
    acc.porMandante.set(p.idmandante, m);

    porCliente.set(p.idcliente, acc);
  }

  const clientes: ReporteClienteObligacionesCliente[] = [...porCliente.values()]
    .map((acc) => {
      const mandantes: ReporteClienteMandanteResumen[] = [
        ...acc.porMandante.entries(),
      ]
        .map(([idmandante, m]) => ({
          idmandante,
          mandanteCodigo: m.codigo,
          mandanteNombre: m.nombre,
          cantidadPrestamos: m.cantidadPrestamos,
          saldoTotal: roundMoney(m.saldoTotal),
          maxDiasMora: m.maxDiasMora,
        }))
        .sort((a, b) => b.saldoTotal - a.saldoTotal);

      return {
        idcliente: acc.idcliente,
        nombreCliente: acc.nombreCliente,
        numerodocumento: acc.numerodocumento,
        cantidadMandantesConDeuda: mandantes.length,
        cantidadPrestamos: acc.obligaciones.length,
        saldoTotal: roundMoney(acc.saldoTotal),
        maxDiasMora: acc.maxDiasMora,
        mandantes,
        obligaciones: acc.obligaciones.sort(
          (a, b) => b.saldoTotal - a.saldoTotal,
        ),
      };
    })
    .filter((c) => c.cantidadMandantesConDeuda >= minMandantes)
    .sort((a, b) => {
      if (b.cantidadMandantesConDeuda !== a.cantidadMandantesConDeuda) {
        return b.cantidadMandantesConDeuda - a.cantidadMandantesConDeuda;
      }
      return b.saldoTotal - a.saldoTotal;
    })
    .slice(0, MAX_CLIENTES);

  const totalSaldo = roundMoney(
    clientes.reduce((s, c) => s + c.saldoTotal, 0),
  );
  const clientesMultiMandante = clientes.filter(
    (c) => c.cantidadMandantesConDeuda >= 2,
  ).length;

  return {
    minMandantes,
    totalClientes: clientes.length,
    totalSaldo,
    totalPrestamos: clientes.reduce((s, c) => s + c.cantidadPrestamos, 0),
    clientesMultiMandante,
    clientes,
  };
}
