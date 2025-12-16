import { builder } from "../../../builder";
import { Pais } from "../types/pais.types";

export const paisesQuery = builder.queryField("paises", (t) =>
  t.prismaField({
    type: [Pais],
    args: {
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_pais.findMany({
        ...query,
        where: args.estado !== undefined ? { estado: args.estado } : undefined,
        orderBy: { descripcion: "asc" },
      });
    },
  })
);

