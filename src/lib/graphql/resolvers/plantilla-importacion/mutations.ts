/**
 * Mutations plantilla importación con versionado inmutable (I014).
 */

import { builder, type GraphQLContext } from '../../builder';

import {
  PlantillaImportacion,
  CreatePlantillaImportacionInput,
  UpdatePlantillaImportacionInput,
  CreatePlantillaImportacionInputSchema,
  UpdatePlantillaImportacionInputSchema,
} from './types';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { IdArgsSchema } from '@/lib/validators/graphql-args';
import {
  debeVersionarMapeo,
  metaNuevaPlantilla,
  metaNuevaVersion,
} from '@/lib/cobranza/plantilla-importacion-version';

builder.mutationField('createPlantillaImportacion', (t) =>
  t.prismaField({
    type: PlantillaImportacion,
    args: {
      input: t.arg({ type: CreatePlantillaImportacionInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const data = CreatePlantillaImportacionInputSchema.parse(args.input);
      await requerirAccesoMandante(ctx.usuario?.idusuario, data.idmandante);
      const meta = metaNuevaPlantilla(data.mapeo);
      return ctx.prisma.tbl_plantilla_importacion.create({
        ...(query as Record<string, unknown>),
        data: {
          ...data,
          contratoId: meta.contratoId,
          version: meta.version,
          mapeoHash: meta.mapeoHash,
        },
      }) as never;
    },
  }),
);

builder.mutationField('updatePlantillaImportacion', (t) =>
  t.prismaField({
    type: PlantillaImportacion,
    args: {
      input: t.arg({ type: UpdatePlantillaImportacionInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const { idplantillaImp, ...updateData } =
        UpdatePlantillaImportacionInputSchema.parse(args.input);

      const existente = await ctx.prisma.tbl_plantilla_importacion.findUnique({
        where: { idplantillaImp },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Plantilla no encontrada.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        updateData.idmandante ?? existente.idmandante,
      );

      if (debeVersionarMapeo(existente.mapeo, updateData.mapeo)) {
        const mapeoNuevo = updateData.mapeo as string;
        const contratoId =
          existente.contratoId ?? metaNuevaPlantilla(existente.mapeo).contratoId;
        const meta = metaNuevaVersion({
          contratoId,
          versionAnterior: existente.version,
          mapeoNuevo,
        });

        await ctx.prisma.tbl_plantilla_importacion.update({
          where: { idplantillaImp },
          data: {
            estado: false,
            deletedAt: new Date(),
            contratoId,
          },
        });

        return ctx.prisma.tbl_plantilla_importacion.create({
          ...(query as Record<string, unknown>),
          data: {
            idmandante: updateData.idmandante ?? existente.idmandante,
            nombre: updateData.nombre ?? existente.nombre,
            mapeo: mapeoNuevo,
            formatoFecha:
              updateData.formatoFecha !== undefined
                ? updateData.formatoFecha
                : existente.formatoFecha,
            estado: updateData.estado ?? true,
            contratoId: meta.contratoId,
            version: meta.version,
            mapeoHash: meta.mapeoHash,
          },
        }) as never;
      }

      return ctx.prisma.tbl_plantilla_importacion.update({
        ...(query as Record<string, unknown>),
        where: { idplantillaImp },
        data: updateData,
      }) as never;
    },
  }),
);

builder.mutationField('deletePlantillaImportacion', (t) =>
  t.field({
    type: 'Boolean',
    args: { id: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const { id } = IdArgsSchema.parse(args);
      const plantilla = await ctx.prisma.tbl_plantilla_importacion.findUnique({
        where: { idplantillaImp: id },
      });
      if (!plantilla || plantilla.deletedAt) {
        throw new GraphQLValidationError('Plantilla no encontrada.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        plantilla.idmandante,
      );
      await ctx.prisma.tbl_plantilla_importacion.update({
        where: { idplantillaImp: id },
        data: { deletedAt: new Date(), estado: false },
      });
      return true;
    },
  }),
);
