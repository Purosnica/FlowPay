import {
  Reclamo,
  ReclamoPage,
  CreateReclamoInput,
  UpdateReclamoEstadoInput,
  CreateReclamoInputSchema,
  UpdateReclamoEstadoInputSchema,
} from './types';
import { builder ,type  GraphQLContext } from '../../builder';


import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { filtroMandante, requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../helpers/graphql-helpers';

builder.queryField('reclamos', (t) =>
  t.field({
    type: ReclamoPage,
    args: {
      idmandante: t.arg.int({ required: false }),
      idprestamo: t.arg.int({ required: false }),
      estado: t.arg.string({ required: false }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_READ);
      const mandanteFilter = await filtroMandante(ctx.usuario?.idusuario);
      if (args.idmandante) {
        await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);
      }

      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );
      const where = {
        deletedAt: null,
        idmandante: args.idmandante ?? mandanteFilter,
        idprestamo: args.idprestamo ?? undefined,
        estado: args.estado ?? undefined,
      };

      const [reclamos, total] = await Promise.all([
        ctx.prisma.tbl_reclamo.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: { cliente: true, prestamo: true },
        }),
        ctx.prisma.tbl_reclamo.count({ where }),
      ]);

      return {
        reclamos,
        ...buildPaginationMeta(total, page, pageSize),
      };
    },
  }),
);

builder.mutationField('createReclamo', (t) =>
  t.prismaField({
    type: Reclamo,
    args: { input: t.arg({ type: CreateReclamoInput, required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_WRITE);
      const data = CreateReclamoInputSchema.parse(args.input);
      await requerirAccesoMandante(ctx.usuario?.idusuario, data.idmandante);
      return ctx.prisma.tbl_reclamo.create({
        ...(query as Record<string, unknown>),
        data: {
          idmandante: data.idmandante,
          idcliente: data.idcliente,
          idprestamo: data.idprestamo,
          descripcion: data.descripcion,
          fechaLimite: data.fechaLimite,
          estado: 'ABIERTO',
        },
      }) as never;
    },
  }),
);

builder.mutationField('updateReclamoEstado', (t) =>
  t.prismaField({
    type: Reclamo,
    args: {
      input: t.arg({ type: UpdateReclamoEstadoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_WRITE);
      const { idreclamo, estado } = UpdateReclamoEstadoInputSchema.parse(
        args.input,
      );
      const existente = await ctx.prisma.tbl_reclamo.findUnique({
        where: { idreclamo },
      });
      if (!existente || existente.deletedAt) {
        throw new Error('Reclamo no encontrado.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        existente.idmandante,
      );
      return ctx.prisma.tbl_reclamo.update({
        ...(query as Record<string, unknown>),
        where: { idreclamo },
        data: { estado },
      }) as never;
    },
  }),
);
