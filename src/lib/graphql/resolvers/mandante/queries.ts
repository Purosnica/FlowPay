import { builder ,type  GraphQLContext } from "../../builder";

import { Mandante, MandantePage, CampanaPage } from "./types";
import type { Prisma } from "@prisma/client";
import { requerirPermiso, requerirAlgunPermiso } from "@/lib/permissions/permission-service";
import { PERMISO } from "@/lib/permissions/permiso-codes";
import { filtroMandante, requerirAccesoMandante } from "@/lib/cobranza/mandante-scope";
import {
  buildPaginationMeta,
  resolvePagination,
} from "../../helpers/graphql-helpers";

async function whereMandanteActivo(
  ctx: GraphQLContext,
): Promise<Prisma.tbl_mandanteWhereInput> {
  const mandanteFilter = await filtroMandante(ctx.usuario?.idusuario);
  return {
    deletedAt: null,
    idmandante: mandanteFilter,
  };
}

builder.queryField("mandante", (t) =>
  t.prismaField({
    type: Mandante,
    nullable: true,
    args: { id: t.arg.int({ required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_READ);
      await requerirAccesoMandante(ctx.usuario?.idusuario, args.id);
      return ctx.prisma.tbl_mandante.findFirst({
        ...(query as Record<string, unknown>),
        where: { idmandante: args.id, deletedAt: null },
      }) as never;
    },
  }),
);

builder.queryField("mandantes", (t) =>
  t.field({
    type: MandantePage,
    args: {
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
      search: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirAlgunPermiso(ctx.usuario?.idusuario, [
        PERMISO.MANDANTE_READ,
        PERMISO.CARTERA_READ,
      ]);
      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );
      const where: Prisma.tbl_mandanteWhereInput = await whereMandanteActivo(ctx);
      if (args.search) {
        where.OR = [
          { nombre: { contains: args.search } },
          { codigo: { contains: args.search } },
        ];
      }
      const [mandantes, total] = await Promise.all([
        ctx.prisma.tbl_mandante.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { nombre: "asc" },
        }),
        ctx.prisma.tbl_mandante.count({ where }),
      ]);
      return {
        mandantes,
        ...buildPaginationMeta(total, page, pageSize),
      };
    },
  }),
);

builder.queryField("campanas", (t) =>
  t.field({
    type: CampanaPage,
    args: {
      idmandante: t.arg.int({ required: true }),
      estado: t.arg.string({ required: false }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);

      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );
      const where = {
        idmandante: args.idmandante,
        deletedAt: null,
        ...(args.estado ? { estado: args.estado } : {}),
      };

      const [campanas, total] = await Promise.all([
        ctx.prisma.tbl_campana.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { fechaCorte: "desc" },
        }),
        ctx.prisma.tbl_campana.count({ where }),
      ]);

      return {
        campanas,
        ...buildPaginationMeta(total, page, pageSize),
      };
    },
  }),
);
