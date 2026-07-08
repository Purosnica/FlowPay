import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from '../../builder';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

type ReclamoListItem = Prisma.tbl_reclamoGetPayload<{
  include: { cliente: true; prestamo: true };
}>;

export const CreateReclamoInputSchema = z.object({
  idmandante: z.number().int().positive(),
  idcliente: z.number().int().positive(),
  idprestamo: z.number().int().positive().optional(),
  descripcion: z.string().min(1),
  fechaLimite: z.union([z.date(), z.string()]).transform((v) =>
    typeof v === 'string' ? new Date(v) : v,
  ),
});

export const UpdateReclamoEstadoInputSchema = z.object({
  idreclamo: z.number().int().positive(),
  estado: z.enum(['ABIERTO', 'EN_PROCESO', 'RESUELTO']),
});

export const CreateReclamoInput = builder
  .inputRef('CreateReclamoInput')
  .implement({
    fields: (t) => ({
      idmandante: t.int({ required: true }),
      idcliente: t.int({ required: true }),
      idprestamo: t.int({ required: false }),
      descripcion: t.string({ required: true }),
      fechaLimite: t.field({ type: 'DateTime', required: true }),
    }),
  });

export const UpdateReclamoEstadoInput = builder
  .inputRef('UpdateReclamoEstadoInput')
  .implement({
    fields: (t) => ({
      idreclamo: t.int({ required: true }),
      estado: t.string({ required: true }),
    }),
  });

export const Reclamo = definePrismaObject('tbl_reclamo', {
  fields: (t) => ({
    idreclamo: t.exposeInt('idreclamo'),
    idmandante: t.exposeInt('idmandante'),
    idcliente: t.exposeInt('idcliente'),
    idprestamo: t.exposeInt('idprestamo', { nullable: true }),
    descripcion: t.exposeString('descripcion'),
    estado: t.exposeString('estado'),
    fechaLimite: t.expose('fechaLimite', { type: 'DateTime' }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    cliente: t.relation('cliente'),
    prestamo: t.relation('prestamo'),
  }),
});

export const ReclamoPage = builder
  .objectRef<{
    reclamos: ReclamoListItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>('ReclamoPage')
  .implement({
    fields: (t) => ({
      reclamos: t.field({
        type: [Reclamo],
        resolve: (parent) => parent.reclamos,
      }),
      total: t.exposeInt('total'),
      page: t.exposeInt('page'),
      pageSize: t.exposeInt('pageSize'),
      totalPages: t.exposeInt('totalPages'),
    }),
  });
