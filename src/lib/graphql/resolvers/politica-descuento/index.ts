import {
  PoliticaDescuento,
  CreatePoliticaDescuentoInput,
  UpdatePoliticaDescuentoInput,
  CreatePoliticaDescuentoInputSchema,
  UpdatePoliticaDescuentoInputSchema,
} from './types';
import { builder ,type  GraphQLContext } from '../../builder';


import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { createPageType } from '../../helpers/create-page-type';
import { resolvePaginatedPrismaQuery } from '../../helpers/paginated-prisma-resolver';
import { registrarAuditoria } from '@/lib/cobranza/auditoria-service';

const PoliticaDescuentoPage = createPageType(
  'PoliticaDescuentoPage',
  PoliticaDescuento,
  'politicas',
);

builder.queryField('politicasDescuento', (t) =>
  t.field({
    type: PoliticaDescuentoPage,
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
        itemsFieldName: 'politicas',
        findMany: (skip, take) =>
          ctx.prisma.tbl_politica_descuento.findMany({
            where,
            skip,
            take,
            orderBy: { tramoMoraMin: 'asc' },
          }),
        count: () => ctx.prisma.tbl_politica_descuento.count({ where }),
      }) as never;
    },
  }),
);

builder.mutationField('createPoliticaDescuento', (t) =>
  t.prismaField({
    type: PoliticaDescuento,
    args: {
      input: t.arg({ type: CreatePoliticaDescuentoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const data = CreatePoliticaDescuentoInputSchema.parse(args.input);
      await requerirAccesoMandante(ctx.usuario?.idusuario, data.idmandante);
      return ctx.prisma.tbl_politica_descuento.create({
        ...(query as Record<string, unknown>),
        data: {
          idmandante: data.idmandante,
          tramoMoraMin: data.tramoMoraMin,
          tramoMoraMax: data.tramoMoraMax ?? null,
          porcentaje: data.porcentaje,
          estado: data.estado,
        },
      }) as never;
    },
  }),
);

builder.mutationField('updatePoliticaDescuento', (t) =>
  t.prismaField({
    type: PoliticaDescuento,
    args: {
      input: t.arg({ type: UpdatePoliticaDescuentoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const { idpolitica, ...updateData } =
        UpdatePoliticaDescuentoInputSchema.parse(args.input);
      const existente = await ctx.prisma.tbl_politica_descuento.findUnique({
        where: { idpolitica },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Política no encontrada.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        existente.idmandante,
      );

      const cambiaTramo =
        updateData.tramoMoraMin !== undefined ||
        updateData.tramoMoraMax !== undefined ||
        updateData.porcentaje !== undefined;

      if (!cambiaTramo) {
        return ctx.prisma.tbl_politica_descuento.update({
          ...(query as Record<string, unknown>),
          where: { idpolitica },
          data: updateData,
        }) as never;
      }

      const ahora = new Date();
      const creada = await ctx.prisma.$transaction(async (tx) => {
        await tx.tbl_politica_descuento.update({
          where: { idpolitica },
          data: {
            vigenteHasta: ahora,
            deletedAt: ahora,
            estado: false,
          },
        });
        return tx.tbl_politica_descuento.create({
          ...(query as Record<string, unknown>),
          data: {
            idmandante: existente.idmandante,
            tramoMoraMin: updateData.tramoMoraMin ?? existente.tramoMoraMin,
            tramoMoraMax:
              updateData.tramoMoraMax !== undefined
                ? updateData.tramoMoraMax
                : existente.tramoMoraMax,
            porcentaje: updateData.porcentaje ?? existente.porcentaje,
            estado: updateData.estado ?? true,
            vigenteDesde: ahora,
          },
        });
      });

      await registrarAuditoria(ctx.prisma, {
        idusuario: ctx.usuario?.idusuario,
        entidad: 'tbl_politica_descuento',
        entidadId: creada.idpolitica,
        accion: 'VERSIONAR',
        detalle: JSON.stringify({ reemplaza: idpolitica }),
      });

      return creada as never;
    },
  }),
);

builder.mutationField('deletePoliticaDescuento', (t) =>
  t.field({
    type: 'Boolean',
    args: { idpolitica: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const existente = await ctx.prisma.tbl_politica_descuento.findUnique({
        where: { idpolitica: args.idpolitica },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Política no encontrada.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        existente.idmandante,
      );
      await ctx.prisma.tbl_politica_descuento.update({
        where: { idpolitica: args.idpolitica },
        data: { deletedAt: new Date(), estado: false },
      });
      return true;
    },
  }),
);
