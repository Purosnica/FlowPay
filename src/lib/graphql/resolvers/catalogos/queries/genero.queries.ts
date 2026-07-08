import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder } from "../../../builder";
import { Genero } from "../types/genero.types";
import { authCatalogoLectura } from "@/lib/graphql/auth-helpers";

export const generosQuery = builder.queryField("generos", (t) =>
  t.prismaField({
    type: [Genero],
    args: {
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      await authCatalogoLectura(ctx);
      return ctx.prisma.tbl_genero.findMany({
        ...spreadPrismaQuery(query),
        where: args.estado !== undefined && args.estado !== null ? { estado: args.estado } : undefined,
        orderBy: { descripcion: "asc" },
      });
    },
  })
);







