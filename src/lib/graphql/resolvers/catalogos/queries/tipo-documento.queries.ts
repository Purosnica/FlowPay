import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder } from "../../../builder";
import { TipoDocumento } from "../types/tipo-documento.types";
import { authCatalogoLectura } from "@/lib/graphql/auth-helpers";

export const tiposDocumentoQuery = builder.queryField("tiposDocumento", (t) =>
  t.prismaField({
    type: [TipoDocumento],
    args: {
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      await authCatalogoLectura(ctx);
      return ctx.prisma.tbl_tipodocumento.findMany({
        ...spreadPrismaQuery(query),
        where: args.estado !== undefined && args.estado !== null ? { estado: args.estado } : undefined,
        orderBy: { descripcion: "asc" },
      });
    },
  })
);







