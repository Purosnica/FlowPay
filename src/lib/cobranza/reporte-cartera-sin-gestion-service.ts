import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import type {
  ReporteCarteraSinGestion,
  ReporteCarteraSinGestionItem,
  ReporteCarteraSinGestionResumenTramo,
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

const UMBRALES = [7, 15, 30] as const;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function diasEntre(desde: Date, hasta: Date): number {
  const ms = startOfDay(hasta).getTime() - startOfDay(desde).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Préstamos en mora/sin cancelar sin gestión reciente.
 */
export async function obtenerReporteCarteraSinGestion(
  idmandante: number,
  idusuario: number,
  diasSinGestion = 7,
): Promise<ReporteCarteraSinGestion> {
  await requerirAccesoMandante(idusuario, idmandante);

  const dias = Number.isInteger(diasSinGestion) && diasSinGestion > 0
    ? diasSinGestion
    : 7;

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const ahora = new Date();
  const desde = new Date(ahora);
  desde.setDate(desde.getDate() - dias);
  desde.setHours(0, 0, 0, 0);

  const prestamosRaw = await prisma.tbl_prestamo.findMany({
    where: {
      idmandante,
      deletedAt: null,
      saldoTotal: { gt: 0 },
      estado: { notIn: ['Cancelado', 'Finalizado'] },
      gestiones: {
        none: {
          deletedAt: null,
          fechaGestion: { gte: desde },
        },
      },
    },
    select: {
      idprestamo: true,
      noPrestamo: true,
      diasMora: true,
      saldoTotal: true,
      cliente: {
        select: {
          primer_nombres: true,
          segundo_nombres: true,
          primer_apellido: true,
          segundo_apellido: true,
        },
      },
      gestor: { select: { nombre: true } },
      gestiones: {
        where: { deletedAt: null },
        orderBy: { fechaGestion: 'desc' },
        take: 1,
        select: { fechaGestion: true },
      },
    },
    orderBy: { saldoTotal: 'desc' },
  });

  const prestamos: ReporteCarteraSinGestionItem[] = prestamosRaw.map((p) => {
    const ultima = p.gestiones[0]?.fechaGestion ?? null;
    return {
      idprestamo: p.idprestamo,
      noPrestamo: p.noPrestamo,
      nombreCliente: p.cliente ? nombreCliente(p.cliente) : '—',
      nombreGestor: p.gestor?.nombre ?? null,
      diasMora: p.diasMora,
      saldoTotal: decimalToNumber(p.saldoTotal),
      diasSinGestion: ultima ? diasEntre(ultima, ahora) : null,
      ultimaGestion: ultima ? ultima.toISOString().slice(0, 10) : null,
    };
  });

  const saldoTotal = roundMoney(
    prestamos.reduce((s, p) => s + p.saldoTotal, 0),
  );

  const resumenTramos: ReporteCarteraSinGestionResumenTramo[] = [];
  for (const umbral of UMBRALES) {
    const corte = new Date(ahora);
    corte.setDate(corte.getDate() - umbral);
    corte.setHours(0, 0, 0, 0);

    const subset = await prisma.tbl_prestamo.findMany({
      where: {
        idmandante,
        deletedAt: null,
        saldoTotal: { gt: 0 },
        estado: { notIn: ['Cancelado', 'Finalizado'] },
        gestiones: {
          none: {
            deletedAt: null,
            fechaGestion: { gte: corte },
          },
        },
      },
      select: { saldoTotal: true },
    });

    resumenTramos.push({
      diasUmbral: umbral,
      cantidadPrestamos: subset.length,
      saldoTotal: roundMoney(
        subset.reduce((s, p) => s + decimalToNumber(p.saldoTotal), 0),
      ),
    });
  }

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    diasSinGestion: dias,
    totalPrestamos: prestamos.length,
    saldoTotal,
    resumenTramos,
    prestamos,
  };
}
