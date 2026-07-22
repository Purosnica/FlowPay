import { prisma } from '@/lib/prisma';
import { filtroMandante } from './mandante-scope';
import { decimalToNumber } from './decimal-utils';
import { contarPromesasVencidas } from './promesas-vencidas-service';
import {
  CLAVE_DIAS_SIN_GESTION_ALERTA,
  obtenerConfigNumerica,
} from './configuracion-cobranza-service';
import {
  ordenarPorPrioridad,
} from './priorizacion-cartera-service';
import { cargarContextosPrioridad } from './bandeja-cobrador-service';
import { MI_DIA_PRIORIDAD_CANDIDATE_LIMIT, obtenerLimiteCandidatosMiDia } from './performance-limits';
import type { MiDiaCaso, MiDiaResumen } from '@/types/cobranza';

export type { MiDiaCaso, MiDiaResumen };

function nombreCliente(
  cliente: {
    primer_nombres: string;
    segundo_nombres: string | null;
    primer_apellido: string;
    segundo_apellido: string | null;
  } | null,
): string {
  if (!cliente) {
    return '—';
  }
  return [
    cliente.primer_nombres,
    cliente.segundo_nombres,
    cliente.primer_apellido,
    cliente.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ');
}

export async function obtenerCasosPrioritariosMiDia(
  idusuario: number,
  limite = 10,
): Promise<MiDiaCaso[]> {
  const mandanteFilter = await filtroMandante(idusuario);
  const diasAlerta = await obtenerConfigNumerica(CLAVE_DIAS_SIN_GESTION_ALERTA);
  const candidateLimit = await obtenerLimiteCandidatosMiDia(
    typeof mandanteFilter?.in?.[0] === 'number' &&
      mandanteFilter.in.length === 1
      ? mandanteFilter.in[0]
      : undefined,
  );

  const prestamos = await prisma.tbl_prestamo.findMany({
    where: {
      deletedAt: null,
      idgestorAsignado: idusuario,
      idmandante: mandanteFilter,
      diasMora: { gt: 0 },
      estado: { notIn: ['Cancelado', 'Finalizado'] },
    },
    orderBy: { diasMora: 'desc' },
    take: candidateLimit || MI_DIA_PRIORIDAD_CANDIDATE_LIMIT,
    include: {
      cliente: {
        select: {
          primer_nombres: true,
          segundo_nombres: true,
          primer_apellido: true,
          segundo_apellido: true,
          celular: true,
          telefono: true,
        },
      },
    },
  });

  const contextos = await cargarContextosPrioridad(
    prestamos.map((p) => p.idprestamo),
    diasAlerta,
  );

  const ordenados = ordenarPorPrioridad(prestamos, contextos, diasAlerta);

  return ordenados.slice(0, limite).map((p) => ({
    idprestamo: p.idprestamo,
    noPrestamo: p.noPrestamo,
    nombreCliente: nombreCliente(p.cliente),
    saldoTotal: decimalToNumber(p.saldoTotal),
    diasMora: p.diasMora,
    scorePrioridad: p.scorePrioridad,
    motivoPrioridad: p.motivoPrioridad,
    telefono: p.cliente?.celular ?? p.cliente?.telefono ?? null,
  }));
}

export async function obtenerResumenMiDia(
  idusuario: number,
): Promise<MiDiaResumen> {
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(inicioDia);
  finDia.setDate(finDia.getDate() + 1);

  const casosPrioritariosList = await obtenerCasosPrioritariosMiDia(
    idusuario,
    100,
  );
  const casosAltaPrioridad = casosPrioritariosList.filter(
    (c) => c.scorePrioridad >= 100,
  ).length;

  const [
    promesasHoy,
    promesasVencidas,
    gestionesHoy,
    pagosHoy,
    aggPagos,
    agendaHoy,
  ] = await Promise.all([
    prisma.tbl_gestion.count({
      where: {
        deletedAt: null,
        idgestor: idusuario,
        fechaPromesa: { gte: inicioDia, lt: finDia },
      },
    }),
    contarPromesasVencidas(idusuario, true),
    prisma.tbl_gestion.count({
      where: {
        deletedAt: null,
        idgestor: idusuario,
        fechaGestion: { gte: inicioDia },
      },
    }),
    prisma.tbl_pago.count({
      where: {
        deletedAt: null,
        idgestor: idusuario,
        fechaPago: { gte: inicioDia },
        aplicado: true,
      },
    }),
    prisma.tbl_pago.aggregate({
      where: {
        deletedAt: null,
        idgestor: idusuario,
        fechaPago: { gte: inicioDia },
        aplicado: true,
      },
      _sum: { monto: true },
    }),
    prisma.tbl_gestion.count({
      where: {
        deletedAt: null,
        idgestor: idusuario,
        fechaProximaGestion: { gte: inicioDia, lt: finDia },
      },
    }),
  ]);

  return {
    casosPrioritarios: casosAltaPrioridad || casosPrioritariosList.length,
    promesasHoy,
    promesasVencidas,
    gestionesHoy,
    pagosHoy,
    montoRecuperadoHoy: decimalToNumber(aggPagos._sum.monto),
    agendaHoy,
  };
}
