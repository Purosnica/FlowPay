import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder } from "../../../builder";
import { TipoPersona } from "../types/tipo-persona.types";
import { authCatalogoLectura } from "@/lib/graphql/auth-helpers";

export const tiposPersonaQuery = builder.queryField("tiposPersona", (t) =>
  t.prismaField({
    type: [TipoPersona],
    args: {
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      await authCatalogoLectura(ctx);
      return ctx.prisma.tbl_tipopersona.findMany({
        ...spreadPrismaQuery(query),
        where: args.estado !== undefined && args.estado !== null ? { estado: args.estado } : undefined,
        orderBy: { descripcion: "asc" },
      });
    },
  })
);







