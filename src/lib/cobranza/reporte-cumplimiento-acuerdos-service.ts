import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import type {
  ReporteCumplimientoAcuerdoItem,
  ReporteCumplimientoAcuerdos,
} from '@/types/cobranza';

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

/**
 * Reporte de cumplimiento de acuerdos creados en el periodo.
 */
export async function obtenerReporteCumplimientoAcuerdos(
  idmandante: number,
  idusuario: number,
  periodo: string,
): Promise<ReporteCumplimientoAcuerdos> {
  await requerirAccesoMandante(idusuario, idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const { inicio, fin, periodo: periodoNorm } = parsePeriodo(periodo);

  const acuerdosRaw = await prisma.tbl_acuerdo.findMany({
    where: {
      idmandante,
      deletedAt: null,
      createdAt: { gte: inicio, lt: fin },
    },
    include: {
      prestamo: {
        select: {
          noPrestamo: true,
          cliente: {
            select: {
              primer_nombres: true,
              segundo_nombres: true,
              primer_apellido: true,
              segundo_apellido: true,
            },
          },
          gestor: { select: { nombre: true } },
        },
      },
      gestion: {
        select: { gestor: { select: { nombre: true } } },
      },
      cuotas: {
        select: { estado: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const acuerdos: ReporteCumplimientoAcuerdoItem[] = acuerdosRaw.map((a) => {
    const cuotasPendientes = a.cuotas.filter(
      (c) => c.estado === 'PENDIENTE',
    ).length;
    const cuotasPagadas = a.cuotas.filter(
      (c) => c.estado === 'PAGADA',
    ).length;
    const cuotasVencidas = a.cuotas.filter(
      (c) => c.estado === 'VENCIDA',
    ).length;

    return {
      idacuerdo: a.idacuerdo,
      noPrestamo: a.prestamo.noPrestamo,
      nombreCliente: a.prestamo.cliente
        ? nombreCliente(a.prestamo.cliente)
        : '—',
      nombreGestor:
        a.gestion?.gestor?.nombre ?? a.prestamo.gestor?.nombre ?? null,
      estado: a.estado,
      montoAcordado: decimalToNumber(a.montoAcordado),
      numeroCuotas: a.numeroCuotas,
      cuotasPendientes,
      cuotasPagadas,
      cuotasVencidas,
      fechaInicio: a.fechaInicio.toISOString().slice(0, 10),
    };
  });

  const vigentes = acuerdos.filter((a) => a.estado === 'VIGENTE').length;
  const cumplidos = acuerdos.filter((a) => a.estado === 'CUMPLIDO').length;
  const rotos = acuerdos.filter((a) => a.estado === 'ROTO').length;
  const cerrados = cumplidos + rotos;
  const cumplimientoPct =
    cerrados > 0 ? roundMoney((cumplidos / cerrados) * 100) : 0;

  const montoAcordadoTotal = roundMoney(
    acuerdos.reduce((s, a) => s + a.montoAcordado, 0),
  );
  const montoCumplido = roundMoney(
    acuerdos
      .filter((a) => a.estado === 'CUMPLIDO')
      .reduce((s, a) => s + a.montoAcordado, 0),
  );

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: periodoNorm,
    totalAcuerdos: acuerdos.length,
    vigentes,
    cumplidos,
    rotos,
    cumplimientoPct,
    montoAcordadoTotal,
    montoCumplido,
    acuerdos,
  };
}
