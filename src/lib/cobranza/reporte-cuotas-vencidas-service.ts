import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import type {
  ReporteCuotaVencidaItem,
  ReporteCuotasVencidas,
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
 * Cuotas de acuerdos en estado VENCIDA.
 */
export async function obtenerReporteCuotasVencidas(
  idmandante: number,
  idusuario: number,
): Promise<ReporteCuotasVencidas> {
  await requerirAccesoMandante(idusuario, idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const cuotasRaw = await prisma.tbl_acuerdo_cuota.findMany({
    where: {
      estado: 'VENCIDA',
      acuerdo: {
        idmandante,
        deletedAt: null,
      },
    },
    include: {
      acuerdo: {
        select: {
          idacuerdo: true,
          estado: true,
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
        },
      },
    },
    orderBy: { fechaVencimiento: 'asc' },
  });

  const cuotas: ReporteCuotaVencidaItem[] = cuotasRaw.map((c) => {
    const diasVencidos = Math.max(
      1,
      Math.floor(
        (hoy.getTime() - c.fechaVencimiento.getTime()) / 86_400_000,
      ),
    );
    return {
      idcuota: c.idcuota,
      idacuerdo: c.acuerdo.idacuerdo,
      noPrestamo: c.acuerdo.prestamo.noPrestamo,
      nombreCliente: c.acuerdo.prestamo.cliente
        ? nombreCliente(c.acuerdo.prestamo.cliente)
        : '—',
      nombreGestor:
        c.acuerdo.gestion?.gestor?.nombre ??
        c.acuerdo.prestamo.gestor?.nombre ??
        null,
      numeroCuota: c.numeroCuota,
      montoCuota: decimalToNumber(c.montoCuota),
      fechaVencimiento: c.fechaVencimiento.toISOString().slice(0, 10),
      diasVencidos,
      estadoAcuerdo: c.acuerdo.estado,
    };
  });

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    totalCuotas: cuotas.length,
    montoTotal: roundMoney(cuotas.reduce((s, c) => s + c.montoCuota, 0)),
    cuotas,
  };
}
