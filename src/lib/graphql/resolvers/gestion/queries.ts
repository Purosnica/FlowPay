import { builder ,type  GraphQLContext } from "../../builder";

import { GestionPage, PromesaVencidaType } from "./types";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import { PERMISO } from "@/lib/permissions/permiso-codes";
import { filtroMandante, requerirAccesoMandante } from "@/lib/cobranza/mandante-scope";
import { whereGestionPorRol } from "@/lib/cobranza/cobrador-scope";
import { obtenerPromesasVencidas } from "@/lib/cobranza/promesas-vencidas-service";
import { GraphQLValidationError } from "@/lib/errors/graphql-errors";
import {
  buildPaginationMeta,
  resolvePagination,
} from "../../helpers/graphql-helpers";

builder.queryField("gestiones", (t) =>
  t.field({
    type: GestionPage,
    args: {
      idprestamo: t.arg.int({ required: false }),
      idmandante: t.arg.int({ required: false }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_READ);
      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );
      const mandanteFilter = await filtroMandante(ctx.usuario?.idusuario);
      const scopeCobrador = ctx.usuario?.idusuario
        ? await whereGestionPorRol(ctx.usuario.idusuario)
        : {};

      if (args.idmandante) {
        await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);
      }

      const where = {
        deletedAt: null,
        idmandante: args.idmandante ?? mandanteFilter,
        ...(args.idprestamo ? { idprestamo: args.idprestamo } : {}),
        ...scopeCobrador,
      };

      const [gestiones, total] = await Promise.all([
        ctx.prisma.tbl_gestion.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { fechaGestion: "desc" },
          include: { gestor: true, codaccion: true, codresult: true },
        }),
        ctx.prisma.tbl_gestion.count({ where }),
      ]);

      return { gestiones, ...buildPaginationMeta(total, page, pageSize) };
    },
  }),
);

function rangoFechaGestion(
  fechaDesde?: string | null,
  fechaHasta?: string | null,
): { gte?: Date; lt?: Date } | null {
  if (!fechaDesde && !fechaHasta) {
    return null;
  }

  const rango: { gte?: Date; lt?: Date } = {};

  if (fechaDesde) {
    const desde = new Date(fechaDesde);
    if (!Number.isNaN(desde.getTime())) {
      desde.setHours(0, 0, 0, 0);
      rango.gte = desde;
    }
  }

  if (fechaHasta) {
    const hastaExclusive = new Date(fechaHasta);
    if (!Number.isNaN(hastaExclusive.getTime())) {
      hastaExclusive.setHours(0, 0, 0, 0);
      hastaExclusive.setDate(hastaExclusive.getDate() + 1);
      rango.lt = hastaExclusive;
    }
  }

  return Object.keys(rango).length > 0 ? rango : null;
}

builder.queryField("misGestionesHoy", (t) =>
  t.field({
    type: GestionPage,
    args: {
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
      fechaDesde: t.arg.string({ required: false }),
      fechaHasta: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_READ);
      if (!ctx.usuario) {
        return {
          gestiones: [],
          ...buildPaginationMeta(0, 1, args.pageSize ?? 20),
        };
      }

      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );
      const mandanteFilter = await filtroMandante(ctx.usuario.idusuario);
      const rangoFecha = rangoFechaGestion(args.fechaDesde, args.fechaHasta);

      const where = rangoFecha
        ? {
            idgestor: ctx.usuario.idusuario,
            deletedAt: null,
            idmandante: mandanteFilter,
            fechaGestion: rangoFecha,
          }
        : (() => {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const manana = new Date(hoy);
            manana.setDate(manana.getDate() + 1);
            return {
              idgestor: ctx.usuario.idusuario,
              deletedAt: null,
              idmandante: mandanteFilter,
              OR: [
                { fechaGestion: { gte: hoy, lt: manana } },
                { fechaProximaGestion: { gte: hoy, lt: manana } },
              ],
            };
          })();

      const [gestiones, total] = await Promise.all([
        ctx.prisma.tbl_gestion.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { fechaGestion: 'desc' },
          include: {
            gestor: true,
            codaccion: true,
            codresult: true,
            prestamo: {
              include: {
                cliente: {
                  select: {
                    primer_nombres: true,
                    primer_apellido: true,
                    numerodocumento: true,
                  },
                },
              },
            },
          },
        }),
        ctx.prisma.tbl_gestion.count({ where }),
      ]);

      return {
        gestiones,
        ...buildPaginationMeta(total, page, pageSize),
      };
    },
  }),
);

builder.queryField('promesasVencidas', (t) =>
  t.field({
    type: [PromesaVencidaType],
    args: {
      soloMisAsignados: t.arg.boolean({ required: false, defaultValue: true }),
      limit: t.arg.int({ required: false, defaultValue: 50 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerPromesasVencidas(idusuario, {
        soloMisAsignados: args.soloMisAsignados ?? true,
        limit: args.limit ?? 50,
      });
    },
  }),
);
