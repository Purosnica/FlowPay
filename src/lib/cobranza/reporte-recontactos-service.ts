import { prisma } from '@/lib/prisma';
import {
  CLIENTE_NOMBRE_SELECT,
  formatNombreClienteDisplay,
} from '@/lib/logic/cliente-tipo-persona-logic';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import type {
  ReporteRecontactoItem,
  ReporteRecontactos,
} from '@/types/cobranza';

/**
 * Préstamos con muchas gestiones en el periodo y sin pago aplicado.
 */
export async function obtenerReporteRecontactos(
  idmandante: number,
  idusuario: number,
  periodo: string,
  minGestiones = 3,
): Promise<ReporteRecontactos> {
  await requerirAccesoMandante(idusuario, idmandante);

  const min = Number.isInteger(minGestiones) && minGestiones > 0
    ? minGestiones
    : 3;

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const { inicio, fin, periodo: periodoNorm } = parsePeriodo(periodo);

  const agrupado = await prisma.tbl_gestion.groupBy({
    by: ['idprestamo'],
    where: {
      idmandante,
      deletedAt: null,
      fechaGestion: { gte: inicio, lt: fin },
    },
    _count: { idgestion: true },
    _max: { fechaGestion: true },
  });

  const filtrado = agrupado.filter((g) => g._count.idgestion >= min);
  const ids = filtrado.map((g) => g.idprestamo);
  if (ids.length === 0) {
    return {
      idmandante,
      mandanteCodigo: mandante.codigo,
      mandanteNombre: mandante.nombre,
      periodo: periodoNorm,
      minGestiones: min,
      totalPrestamos: 0,
      saldoTotal: 0,
      prestamos: [],
    };
  }

  const pagosConPrestamo = await prisma.tbl_pago.findMany({
    where: {
      idmandante,
      deletedAt: null,
      aplicado: true,
      fechaPago: { gte: inicio, lt: fin },
      idprestamo: { in: ids },
    },
    select: { idprestamo: true },
    distinct: ['idprestamo'],
  });
  const conPago = new Set(pagosConPrestamo.map((p) => p.idprestamo));
  const sinPagoIds = ids.filter((id) => !conPago.has(id));

  const countMap = new Map(
    filtrado.map((g) => [g.idprestamo, g._count.idgestion]),
  );
  const ultimaMap = new Map(
    filtrado.map((g) => [g.idprestamo, g._max.fechaGestion]),
  );

  const prestamosRaw = await prisma.tbl_prestamo.findMany({
    where: { idprestamo: { in: sinPagoIds }, deletedAt: null },
    select: {
      idprestamo: true,
      noPrestamo: true,
      diasMora: true,
      saldoTotal: true,
      cliente: {
        select: { ...CLIENTE_NOMBRE_SELECT },
      },
      gestor: { select: { nombre: true } },
    },
  });

  const prestamos: ReporteRecontactoItem[] = prestamosRaw
    .map((p) => {
      const ultima = ultimaMap.get(p.idprestamo) ?? null;
      return {
        idprestamo: p.idprestamo,
        noPrestamo: p.noPrestamo,
        nombreCliente: p.cliente
          ? formatNombreClienteDisplay(p.cliente)
          : '—',
        nombreGestor: p.gestor?.nombre ?? null,
        gestionesPeriodo: countMap.get(p.idprestamo) ?? 0,
        diasMora: p.diasMora,
        saldoTotal: decimalToNumber(p.saldoTotal),
        ultimaGestion: ultima ? ultima.toISOString().slice(0, 10) : null,
      };
    })
    .sort((a, b) => b.gestionesPeriodo - a.gestionesPeriodo);

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: periodoNorm,
    minGestiones: min,
    totalPrestamos: prestamos.length,
    saldoTotal: roundMoney(
      prestamos.reduce((s, p) => s + p.saldoTotal, 0),
    ),
    prestamos,
  };
}
