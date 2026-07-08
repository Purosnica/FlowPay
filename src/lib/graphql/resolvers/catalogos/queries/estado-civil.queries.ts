import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder } from "../../../builder";
import { EstadoCivil } from "../types/estado-civil.types";
import { authCatalogoLectura } from "@/lib/graphql/auth-helpers";

export const estadosCivilesQuery = builder.queryField("estadosCiviles", (t) =>
  t.prismaField({
    type: [EstadoCivil],
    args: {
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      await authCatalogoLectura(ctx);
      return ctx.prisma.tbl_estadocivil.findMany({
        ...spreadPrismaQuery(query),
        where: args.estado !== undefined && args.estado !== null ? { estado: args.estado } : undefined,
        orderBy: { descripcion: "asc" },
      });
    },
  })
);







