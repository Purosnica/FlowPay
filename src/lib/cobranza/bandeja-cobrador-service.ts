/**

 * Consulta optimizada de la bandeja del cobrador con priorización inteligente.

 */



import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import type { BandejaFilters } from '@/types/cobranza';

import {

  CLAVE_DIAS_SIN_GESTION_ALERTA,

  obtenerConfigNumerica,

} from './configuracion-cobranza-service';

import {

  ordenarPorPrioridad,

  type ContextoPrioridad,

} from './priorizacion-cartera-service';

import { BANDEJA_PRIORIDAD_CANDIDATE_LIMIT } from './performance-limits';



const BANDEJA_INCLUDE = {

  cliente: {

    select: {

      primer_nombres: true,

      primer_apellido: true,

      numerodocumento: true,

      celular: true,

      telefono: true,

    },

  },

  mandante: {

    select: {

      idmandante: true,

      nombre: true,

    },

  },

} satisfies Prisma.tbl_prestamoInclude;



export function buildBandejaWhere(

  idusuario: number,

  mandanteFilter: Prisma.IntFilter | undefined,

  filters: BandejaFilters,

): Prisma.tbl_prestamoWhereInput {

  const where: Prisma.tbl_prestamoWhereInput = {

    deletedAt: null,

    idmandante: filters.idmandante ?? mandanteFilter,

    idgestorAsignado: idusuario,

    estado: { notIn: ['Cancelado', 'Finalizado'] },

  };



  if (filters.tramoMoraMin !== undefined) {

    if (filters.tramoMoraMax === null || filters.tramoMoraMax === undefined) {

      where.diasMora = { gte: filters.tramoMoraMin };

    } else {

      where.diasMora = {

        gte: filters.tramoMoraMin,

        lte: filters.tramoMoraMax,

      };

    }

  } else {

    where.diasMora = { gt: 0 };

  }



  if (filters.search) {

    where.OR = [

      { noPrestamo: { contains: filters.search } },

      { codigoUnico: { contains: filters.search } },

    ];

  }



  return where;

}



export function buildBandejaOrderBy(

  ordenarPor: BandejaFilters['ordenarPor'],

): Prisma.tbl_prestamoOrderByWithRelationInput[] {

  if (ordenarPor === 'saldo_asc') {

    return [{ saldoTotal: 'asc' }, { diasMora: 'desc' }];

  }

  if (ordenarPor === 'saldo_desc') {

    return [{ saldoTotal: 'desc' }, { diasMora: 'desc' }];

  }

  return [{ diasMora: 'desc' }, { saldoTotal: 'desc' }];

}



export async function cargarContextosPrioridad(

  idprestamos: number[],

  diasSinGestionAlerta: number,

): Promise<Map<number, ContextoPrioridad>> {

  if (idprestamos.length === 0) {

    return new Map();

  }



  const hoy = new Date();

  hoy.setHours(0, 0, 0, 0);

  const manana = new Date(hoy);

  manana.setDate(manana.getDate() + 1);

  const haceAlerta = new Date(hoy);

  haceAlerta.setDate(haceAlerta.getDate() - diasSinGestionAlerta);



  const [promesasVencidas, acuerdosVigentes, ultimasGestiones, agendasHoy] =

    await Promise.all([

      prisma.tbl_gestion.findMany({

        where: {

          deletedAt: null,

          idprestamo: { in: idprestamos },

          fechaPromesa: { lt: hoy },

          montoPromesa: { not: null },

        },

        select: { idprestamo: true },

        distinct: ['idprestamo'],

      }),

      prisma.tbl_acuerdo.findMany({

        where: {

          idprestamo: { in: idprestamos },

          estado: 'VIGENTE',

          deletedAt: null,

        },

        select: { idprestamo: true },

      }),

      prisma.tbl_gestion.groupBy({

        by: ['idprestamo'],

        where: {

          deletedAt: null,

          idprestamo: { in: idprestamos },

        },

        _max: { fechaGestion: true },

      }),

      prisma.tbl_gestion.findMany({

        where: {

          deletedAt: null,

          idprestamo: { in: idprestamos },

          fechaProximaGestion: { gte: hoy, lt: manana },

        },

        select: { idprestamo: true },

        distinct: ['idprestamo'],

      }),

    ]);



  const promesasSet = new Set(promesasVencidas.map((p) => p.idprestamo));

  const acuerdosSet = new Set(acuerdosVigentes.map((a) => a.idprestamo));

  const agendaSet = new Set(agendasHoy.map((a) => a.idprestamo));



  const diasSinGestionMap = new Map<number, number>();

  for (const g of ultimasGestiones) {

    const ultima = g._max.fechaGestion;

    if (!ultima) {

      diasSinGestionMap.set(g.idprestamo, 999);

      continue;

    }

    const diff = Math.floor(

      (hoy.getTime() - ultima.getTime()) / 86_400_000,

    );

    diasSinGestionMap.set(g.idprestamo, Math.max(0, diff));

  }



  const mapa = new Map<number, ContextoPrioridad>();

  for (const id of idprestamos) {

    mapa.set(id, {

      tienePromesaVencida: promesasSet.has(id),

      tieneAcuerdoVigente: acuerdosSet.has(id),

      diasSinGestion: diasSinGestionMap.get(id) ?? 999,

      agendaHoy: agendaSet.has(id),

      diasSinGestionAlerta,

    });

  }

  return mapa;

}



export async function listarBandejaCobrador(

  idusuario: number,

  mandanteFilter: Prisma.IntFilter | undefined,

  filters: BandejaFilters,

  page: number,

  pageSize: number,

) {

  const where = buildBandejaWhere(idusuario, mandanteFilter, filters);

  const usarPrioridad =

    !filters.ordenarPor || filters.ordenarPor === 'prioridad';



  if (usarPrioridad) {

    const diasAlerta = await obtenerConfigNumerica(

      CLAVE_DIAS_SIN_GESTION_ALERTA,

    );

    const todos = await prisma.tbl_prestamo.findMany({

      where,

      include: BANDEJA_INCLUDE,

      orderBy: { diasMora: 'desc' },

      take: BANDEJA_PRIORIDAD_CANDIDATE_LIMIT,

    });



    const contextos = await cargarContextosPrioridad(

      todos.map((p) => p.idprestamo),

      diasAlerta,

    );



    const ordenados = ordenarPorPrioridad(todos, contextos, diasAlerta);

    const filtrados = ordenados.filter((p) => {
      const ctx = contextos.get(p.idprestamo);
      if (filters.soloPromesaVencida && !ctx?.tienePromesaVencida) {
        return false;
      }
      if (filters.soloAgendaHoy && !ctx?.agendaHoy) {
        return false;
      }
      if (
        filters.soloSinGestion &&
        (ctx?.diasSinGestion ?? 0) < diasAlerta
      ) {
        return false;
      }
      if (
        filters.prioridadMin != null &&
        p.scorePrioridad < filters.prioridadMin
      ) {
        return false;
      }
      return true;
    });

    const total = filtrados.length;

    const skip = (page - 1) * pageSize;

    const slice = filtrados.slice(skip, skip + pageSize);



    const prestamos = slice.map((p) => ({

      ...p,

      scorePrioridad: p.scorePrioridad,

      motivoPrioridad: p.motivoPrioridad,

    }));



    return {

      prestamos,

      total,

      page,

      pageSize,

      totalPages: Math.ceil(total / pageSize),

    };

  }



  const orderBy = buildBandejaOrderBy(filters.ordenarPor);

  const skip = (page - 1) * pageSize;



  const [prestamos, total] = await Promise.all([

    prisma.tbl_prestamo.findMany({

      where,

      skip,

      take: pageSize,

      orderBy,

      include: BANDEJA_INCLUDE,

    }),

    prisma.tbl_prestamo.count({ where }),

  ]);



  return {

    prestamos: prestamos.map((p) => ({

      ...p,

      scorePrioridad: null,

      motivoPrioridad: null,

    })),

    total,

    page,

    pageSize,

    totalPages: Math.ceil(total / pageSize),

  };

}



export type BandejaPrestamoRow = Awaited<

  ReturnType<typeof listarBandejaCobrador>

>['prestamos'][number];


