/**
 * RESOLVERS PARA CONFIGURACIÓN DEL SISTEMA
 *
 * Gestiona los parámetros de configuración del sistema.
 * Solo usuarios con permiso CONFIG_SYSTEM pueden leer/modificar.
 */

import { builder ,type  GraphQLContext } from "../../builder";

import {
  ConfiguracionSistema,
  UpdateConfiguracionInput,
  UpdateConfiguracionInputSchema,
  BulkUpdateConfiguracionInput,
  BulkUpdateConfiguracionInputSchema,
} from "./types";
import type { Prisma } from "@prisma/client";
import { authConfigSistema } from "@/lib/graphql/auth-helpers";

const logAuditoria = async (
  ctx: GraphQLContext,
  data: {
    idusuario?: number | null;
    entidad: string;
    entidadId?: number;
    accion: string;
    detalle?: string;
  },
): Promise<void> => {
  await ctx.prisma.tbl_auditoria.create({
    data: {
      idusuario: data.idusuario ?? null,
      entidad: data.entidad,
      entidadId: data.entidadId ?? null,
      accion: data.accion,
      detalle: data.detalle,
    },
  });
};

builder.queryField("configuracionesSistema", (t) =>
  t.field({
    type: [ConfiguracionSistema],
    args: {
      categoria: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await authConfigSistema(ctx);
      const where: Prisma.tbl_configuracion_sistemaWhereInput = {
        deletedAt: null,
      };

      if (args.categoria) {
        where.categoria = args.categoria;
      }

      return ctx.prisma.tbl_configuracion_sistema.findMany({
        where,
        orderBy: [{ categoria: "asc" }, { clave: "asc" }],
      });
    },
  }),
);

builder.queryField("configuracionSistema", (t) =>
  t.prismaField({
    type: ConfiguracionSistema,
    nullable: true,
    args: {
      clave: t.arg.string({ required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authConfigSistema(ctx);
      return ctx.prisma.tbl_configuracion_sistema.findFirst({
        ...(query as Record<string, unknown>),
        where: { clave: args.clave, deletedAt: null },
      }) as never;
    },
  }),
);

builder.mutationField("updateConfiguracionSistema", (t) =>
  t.prismaField({
    type: ConfiguracionSistema,
    args: {
      input: t.arg({ type: UpdateConfiguracionInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      const input = UpdateConfiguracionInputSchema.parse(args.input);
      const idusuarioMod = await authConfigSistema(ctx);

      const configExistente =
        await ctx.prisma.tbl_configuracion_sistema.findFirst({
          where: { clave: input.clave, deletedAt: null },
        });

      if (configExistente) {
        const config = await ctx.prisma.tbl_configuracion_sistema.update({
          ...(query as Record<string, unknown>),
          where: { idconfiguracion: configExistente.idconfiguracion },
          data: {
            valor: input.valor,
            idusuarioMod,
          },
        });

        await logAuditoria(ctx, {
          idusuario: idusuarioMod,
          entidad: "tbl_configuracion_sistema",
          entidadId: config.idconfiguracion,
          accion: "ACTUALIZAR_CONFIGURACION",
          detalle: `Configuración ${input.clave} actualizada. Nuevo valor: ${input.valor}`,
        });

        return config as never;
      }

      const config = await ctx.prisma.tbl_configuracion_sistema.create({
        ...(query as Record<string, unknown>),
        data: {
          clave: input.clave,
          valor: input.valor,
          tipo: "texto",
          idusuarioMod,
        },
      });

      await logAuditoria(ctx, {
        idusuario: idusuarioMod,
        entidad: "tbl_configuracion_sistema",
        entidadId: config.idconfiguracion,
        accion: "CREAR_CONFIGURACION",
        detalle: `Configuración ${input.clave} creada. Valor: ${input.valor}`,
      });

      return config as never;
    },
  }),
);

builder.mutationField("bulkUpdateConfiguracionSistema", (t) =>
  t.field({
    type: [ConfiguracionSistema],
    args: {
      input: t.arg({ type: BulkUpdateConfiguracionInput, required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      const input = BulkUpdateConfiguracionInputSchema.parse(args.input);
      const idusuarioMod = await authConfigSistema(ctx);

      const resultados = await ctx.prisma.$transaction(
        input.configuraciones.map((config) =>
          ctx.prisma.tbl_configuracion_sistema.upsert({
            where: { clave: config.clave },
            update: {
              valor: config.valor,
              idusuarioMod,
            },
            create: {
              clave: config.clave,
              valor: config.valor,
              tipo: "texto",
              idusuarioMod,
            },
          }),
        ),
      );

      await logAuditoria(ctx, {
        idusuario: idusuarioMod,
        entidad: "tbl_configuracion_sistema",
        accion: "BULK_UPDATE_CONFIGURACION",
        detalle: `${input.configuraciones.length} configuraciones actualizadas`,
      });

      return resultados;
    },
  }),
);
