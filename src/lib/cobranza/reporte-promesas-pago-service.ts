import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import type {
  ReportePromesaPagoItem,
  ReportePromesasPago,
} from '@/types/cobranza';
import { resolverEstadoPromesa } from '@/lib/logic/promesa-estado-logic';

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
 * Promesas de pago del periodo: cumplidas / vencidas / pendientes.
 */
export async function obtenerReportePromesasPago(
  idmandante: number,
  idusuario: number,
  periodo: string,
): Promise<ReportePromesasPago> {
  await requerirAccesoMandante(idusuario, idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const { inicio, fin, periodo: periodoNorm } = parsePeriodo(periodo);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const gestiones = await prisma.tbl_gestion.findMany({
    where: {
      idmandante,
      deletedAt: null,
      montoPromesa: { not: null },
      fechaPromesa: { not: null, gte: inicio, lt: fin },
    },
    include: {
      gestor: { select: { nombre: true } },
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
        },
      },
    },
    orderBy: { fechaPromesa: 'asc' },
  });

  const promesas: ReportePromesaPagoItem[] = gestiones.map((g) => {
    const fechaPromesa = g.fechaPromesa ?? hoy;
    let estado =
      resolverEstadoPromesa({
        estadoPromesa: g.estadoPromesa,
        nota: g.nota,
        tienePromesa: true,
      }) ?? 'PENDIENTE';
    if (estado === 'PENDIENTE' && fechaPromesa < hoy) {
      estado = 'VENCIDA';
    }

    const diasVencidos =
      estado === 'VENCIDA'
        ? Math.max(
            1,
            Math.floor(
              (hoy.getTime() - fechaPromesa.getTime()) / 86_400_000,
            ),
          )
        : null;

    return {
      idgestion: g.idgestion,
      noPrestamo: g.prestamo.noPrestamo,
      nombreCliente: g.prestamo.cliente
        ? nombreCliente(g.prestamo.cliente)
        : '—',
      nombreGestor: g.gestor.nombre,
      montoPromesa: decimalToNumber(g.montoPromesa),
      fechaPromesa: fechaPromesa.toISOString().slice(0, 10),
      estado,
      diasVencidos,
    };
  });

  const cumplidas = promesas.filter((p) => p.estado === 'CUMPLIDA').length;
  const vencidas = promesas.filter((p) => p.estado === 'VENCIDA').length;
  const pendientes = promesas.filter((p) => p.estado === 'PENDIENTE').length;
  const cerradas = cumplidas + vencidas;
  const cumplimientoPct =
    cerradas > 0 ? roundMoney((cumplidas / cerradas) * 100) : 0;
  const montoPrometido = roundMoney(
    promesas.reduce((s, p) => s + p.montoPromesa, 0),
  );
  const montoCumplido = roundMoney(
    promesas
      .filter((p) => p.estado === 'CUMPLIDA')
      .reduce((s, p) => s + p.montoPromesa, 0),
  );

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: periodoNorm,
    totalPromesas: promesas.length,
    cumplidas,
    vencidas,
    pendientes,
    cumplimientoPct,
    montoPrometido,
    montoCumplido,
    promesas,
  };
}
