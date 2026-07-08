import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder } from "../../../builder";
import { Pais } from "../types/pais.types";
import { authCatalogoLectura } from "@/lib/graphql/auth-helpers";

export const paisesQuery = builder.queryField("paises", (t) =>
  t.prismaField({
    type: [Pais],
    args: {
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      await authCatalogoLectura(ctx);
      return ctx.prisma.tbl_pais.findMany({
        ...spreadPrismaQuery(query),
        where: args.estado !== undefined && args.estado !== null ? { estado: args.estado } : undefined,
        orderBy: { descripcion: "asc" },
      });
    },
  })
);







