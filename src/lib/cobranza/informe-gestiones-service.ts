/**
 * Agrega gestiones de cobradores/supervisores en el formato
 * "Informe de gestiones" (plantilla Excel REGISTROS).
 */

import { prisma } from '@/lib/prisma';
import {
  CLIENTE_NOMBRE_SELECT,
  formatNombreClienteDisplay,
} from '@/lib/logic/cliente-tipo-persona-logic';
import { requerirAccesoMandante } from './mandante-scope';
import { whereGestionPorRol } from './cobrador-scope';
import { decimalToNumber } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import type { InformeGestionItem, InformeGestiones } from '@/types/cobranza';

const MESES_ES_UPPER = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
] as const;

function formatearFechaIso(d: Date | null | undefined): string {
  if (!d) {
    return '';
  }
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function mesUpperDesdeFecha(d: Date): string {
  return MESES_ES_UPPER[d.getUTCMonth()] ?? '';
}

export async function obtenerInformeGestiones(
  idmandante: number,
  idusuario: number,
  periodo: string,
  idgestor?: number | null,
): Promise<InformeGestiones> {
  await requerirAccesoMandante(idusuario, idmandante);

  const { inicio, fin, periodo: periodoNorm } = parsePeriodo(periodo);
  const scopeCobrador = await whereGestionPorRol(idusuario);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { idmandante: true, codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const gestionesRaw = await prisma.tbl_gestion.findMany({
    where: {
      idmandante,
      deletedAt: null,
      fechaGestion: { gte: inicio, lt: fin },
      ...scopeCobrador,
      ...(idgestor != null && idgestor > 0 ? { idgestor } : {}),
    },
    orderBy: [{ fechaGestion: 'asc' }, { idgestion: 'asc' }],
    include: {
      gestor: { select: { nombre: true } },
      codaccion: { select: { codigo: true } },
      codresult: { select: { codigo: true, descripcion: true } },
      prestamo: {
        select: {
          noPrestamo: true,
          codigoUnico: true,
          idcliente: true,
          campana: { select: { nombre: true } },
          agencia: { select: { nombre: true } },
          cliente: {
            select: { ...CLIENTE_NOMBRE_SELECT },
          },
        },
      },
    },
  });

  const idclientes = [
    ...new Set(gestionesRaw.map((g) => g.prestamo.idcliente)),
  ];
  const idprestamos = [
    ...new Set(gestionesRaw.map((g) => g.idprestamo)),
  ];

  const cantCtasMap = new Map<number, number>();
  if (idclientes.length > 0) {
    const cuentasPorCliente = await prisma.tbl_prestamo.groupBy({
      by: ['idcliente'],
      where: {
        idmandante,
        deletedAt: null,
        idcliente: { in: idclientes },
      },
      _count: { _all: true },
    });
    for (const row of cuentasPorCliente) {
      cantCtasMap.set(row.idcliente, row._count._all);
    }
  }

  const pagosMap = new Map<number, number>();
  if (idprestamos.length > 0) {
    const pagosAgregados = await prisma.tbl_pago.groupBy({
      by: ['idprestamo'],
      where: {
        idmandante,
        deletedAt: null,
        aplicado: true,
        idprestamo: { in: idprestamos },
        fechaPago: { gte: inicio, lt: fin },
      },
      _sum: { monto: true },
    });
    for (const row of pagosAgregados) {
      pagosMap.set(row.idprestamo, decimalToNumber(row._sum.monto));
    }
  }

  const gestiones: InformeGestionItem[] = gestionesRaw.map((g) => {
    const agencia =
      g.prestamo.campana?.nombre?.trim() ||
      g.prestamo.agencia?.nombre?.trim() ||
      '';

    return {
      noPrestamo: g.prestamo.noPrestamo,
      codigoUnico: g.prestamo.codigoUnico,
      nombreCliente: formatNombreClienteDisplay(g.prestamo.cliente),
      cantCtas: cantCtasMap.get(g.prestamo.idcliente) ?? 1,
      agencia,
      gestor: g.gestor.nombre,
      fechaGestion: formatearFechaIso(g.fechaGestion),
      telefonoContacto: g.telefonoContacto ?? '',
      codigoAccion: g.codaccion?.codigo ?? '',
      codigoResultado: g.codresult?.codigo ?? '',
      nota: g.nota,
      razonMora: g.razonMora ?? '',
      montoPromesa:
        g.montoPromesa != null ? decimalToNumber(g.montoPromesa) : null,
      fechaProximaGestion: formatearFechaIso(g.fechaProximaGestion),
      comentario: g.comentario ?? '',
      tipificacion: g.codresult?.descripcion?.trim() || '-',
      mes: mesUpperDesdeFecha(g.fechaGestion),
      pagos: pagosMap.get(g.idprestamo) ?? 0,
    };
  });

  return {
    idmandante: mandante.idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: periodoNorm,
    totalGestiones: gestiones.length,
    gestiones,
  };
}
