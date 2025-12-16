import { builder } from "../../../builder";
import { TipoDocumento } from "../types/tipo-documento.types";

export const tiposDocumentoQuery = builder.queryField("tiposDocumento", (t) =>
  t.prismaField({
    type: [TipoDocumento],
    args: {
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_tipodocumento.findMany({
        ...query,
        where: args.estado !== undefined ? { estado: args.estado } : undefined,
        orderBy: { descripcion: "asc" },
      });
    },
  })
);

