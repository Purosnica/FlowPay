import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder } from "../../../builder";
import { Ocupacion } from "../types/ocupacion.types";
import { authCatalogoLectura } from "@/lib/graphql/auth-helpers";

export const ocupacionesQuery = builder.queryField("ocupaciones", (t) =>
  t.prismaField({
    type: [Ocupacion],
    args: {
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      await authCatalogoLectura(ctx);
      return ctx.prisma.tbl_ocupacion.findMany({
        ...spreadPrismaQuery(query),
        where: args.estado !== undefined && args.estado !== null ? { estado: args.estado } : undefined,
        orderBy: { descripcion: "asc" },
      });
    },
  })
);







