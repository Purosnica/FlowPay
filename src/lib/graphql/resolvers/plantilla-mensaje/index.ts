import {
  PlantillaMensaje,
  CreatePlantillaMensajeInput,
  UpdatePlantillaMensajeInput,
  CreatePlantillaMensajeInputSchema,
  UpdatePlantillaMensajeInputSchema,
} from './types';
import { builder ,type  GraphQLContext } from '../../builder';


import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { createPageType } from '../../helpers/create-page-type';
import { resolvePaginatedPrismaQuery } from '../../helpers/paginated-prisma-resolver';
import { IdPositiveSchema } from '@/lib/validators/graphql-args';
import { z } from 'zod';

const PlantillaMensajePage = createPageType(
  'PlantillaMensajePage',
  PlantillaMensaje,
  'plantillas',
);

builder.queryField('plantillasMensaje', (t) =>
  t.field({
    type: PlantillaMensajePage,
    args: {
      idmandante: t.arg.int({ required: true }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_READ);
      await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);

      const where = { idmandante: args.idmandante, deletedAt: null };

      return resolvePaginatedPrismaQuery({
        page: args.page,
        pageSize: args.pageSize,
        itemsFieldName: 'plantillas',
        findMany: (skip, take) =>
          ctx.prisma.tbl_plantilla_mensaje.findMany({
            where,
            skip,
            take,
            orderBy: { nombre: 'asc' },
          }),
        count: () => ctx.prisma.tbl_plantilla_mensaje.count({ where }),
      }) as never;
    },
  }),
);

builder.mutationField('createPlantillaMensaje', (t) =>
  t.prismaField({
    type: PlantillaMensaje,
    args: {
      input: t.arg({ type: CreatePlantillaMensajeInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const data = CreatePlantillaMensajeInputSchema.parse(args.input);
      await requerirAccesoMandante(ctx.usuario?.idusuario, data.idmandante);
      return ctx.prisma.tbl_plantilla_mensaje.create({
        ...(query as Record<string, unknown>),
        data,
      }) as never;
    },
  }),
);

builder.mutationField('updatePlantillaMensaje', (t) =>
  t.prismaField({
    type: PlantillaMensaje,
    args: {
      input: t.arg({ type: UpdatePlantillaMensajeInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const { idplantilla, ...updateData } =
        UpdatePlantillaMensajeInputSchema.parse(args.input);
      const existente = await ctx.prisma.tbl_plantilla_mensaje.findUnique({
        where: { idplantilla },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Plantilla no encontrada.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        existente.idmandante,
      );
      return ctx.prisma.tbl_plantilla_mensaje.update({
        ...(query as Record<string, unknown>),
        where: { idplantilla },
        data: updateData,
      }) as never;
    },
  }),
);

builder.mutationField('deletePlantillaMensaje', (t) =>
  t.field({
    type: 'Boolean',
    args: { idplantilla: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const { idplantilla } = z
        .object({ idplantilla: IdPositiveSchema })
        .parse(args);
      const existente = await ctx.prisma.tbl_plantilla_mensaje.findUnique({
        where: { idplantilla },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Plantilla no encontrada.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        existente.idmandante,
      );
      await ctx.prisma.tbl_plantilla_mensaje.update({
        where: { idplantilla },
        data: { deletedAt: new Date(), estado: false },
      });
      return true;
    },
  }),
);
