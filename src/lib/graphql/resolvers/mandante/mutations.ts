import { builder ,type  GraphQLContext } from "../../builder";

import {
  Mandante,
  Campana,
  CreateMandanteInput,
  UpdateMandanteInput,
  CreateCampanaInput,
  CreateMandanteInputSchema,
  UpdateMandanteInputSchema,
  CreateCampanaInputSchema,
} from "./types";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import { PERMISO } from "@/lib/permissions/permiso-codes";
import { requerirAccesoMandante } from "@/lib/cobranza/mandante-scope";

builder.mutationField("createMandante", (t) =>
  t.prismaField({
    type: Mandante,
    args: { input: t.arg({ type: CreateMandanteInput, required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const data = CreateMandanteInputSchema.parse(args.input);
      return ctx.prisma.tbl_mandante.create({
        ...(query as Record<string, unknown>),
        data,
      }) as never;
    },
  }),
);

builder.mutationField("updateMandante", (t) =>
  t.prismaField({
    type: Mandante,
    args: { input: t.arg({ type: UpdateMandanteInput, required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const { idmandante, ...updateData } = UpdateMandanteInputSchema.parse(args.input);
      await requerirAccesoMandante(ctx.usuario?.idusuario, idmandante);
      return ctx.prisma.tbl_mandante.update({
        ...(query as Record<string, unknown>),
        where: { idmandante },
        data: updateData,
      }) as never;
    },
  }),
);

builder.mutationField("createCampana", (t) =>
  t.prismaField({
    type: Campana,
    args: { input: t.arg({ type: CreateCampanaInput, required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const data = CreateCampanaInputSchema.parse(args.input);
      await requerirAccesoMandante(ctx.usuario?.idusuario, data.idmandante);
      return ctx.prisma.tbl_campana.create({
        ...(query as Record<string, unknown>),
        data: {
          idmandante: data.idmandante,
          nombre: data.nombre,
          fechaCorte: data.fechaCorte,
        },
      }) as never;
    },
  }),
);

builder.mutationField('cerrarCampana', (t) =>
  t.prismaField({
    type: Campana,
    args: { idcampana: t.arg.int({ required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const campana = await ctx.prisma.tbl_campana.findUnique({
        where: { idcampana: args.idcampana },
      });
      if (!campana || campana.deletedAt) {
        throw new Error('Campaña no encontrada.');
      }
      await requerirAccesoMandante(ctx.usuario?.idusuario, campana.idmandante);
      return ctx.prisma.tbl_campana.update({
        ...(query as Record<string, unknown>),
        where: { idcampana: args.idcampana },
        data: { estado: 'CERRADA' },
      }) as never;
    },
  }),
);

builder.mutationField("asignarUsuarioMandante", (t) =>
  t.field({
    type: "Boolean",
    args: {
      idusuario: t.arg.int({ required: true }),
      idmandante: t.arg.int({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);
      await ctx.prisma.tbl_usuario_mandante.upsert({
        where: {
          idusuario_idmandante: {
            idusuario: args.idusuario,
            idmandante: args.idmandante,
          },
        },
        create: {
          idusuario: args.idusuario,
          idmandante: args.idmandante,
        },
        update: {},
      });
      return true;
    },
  }),
);
