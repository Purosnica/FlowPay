import { builder ,type  GraphQLContext } from "../../builder";

import { CodigoAccion, CodigoResultado } from "./types";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import { PERMISO } from "@/lib/permissions/permiso-codes";

builder.queryField("codigosAccion", (t) =>
  t.field({
    type: [CodigoAccion],
    resolve: async (_parent, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_READ);
      return ctx.prisma.tbl_codigo_accion.findMany({
        where: { estado: true, deletedAt: null },
        orderBy: { codigo: "asc" },
      });
    },
  }),
);

builder.queryField("codigosResultado", (t) =>
  t.field({
    type: [CodigoResultado],
    args: { grupo: t.arg.string({ required: false }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_READ);
      return ctx.prisma.tbl_codigo_resultado.findMany({
        where: {
          estado: true,
          deletedAt: null,
          ...(args.grupo ? { grupo: args.grupo } : {}),
        },
        orderBy: { codigo: "asc" },
      });
    },
  }),
);
