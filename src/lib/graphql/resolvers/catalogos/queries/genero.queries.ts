import { builder } from "../../../builder";
import { Genero } from "../types/genero.types";

export const generosQuery = builder.queryField("generos", (t) =>
  t.prismaField({
    type: [Genero],
    args: {
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_genero.findMany({
        ...(query as any),
        where: args.estado !== undefined && args.estado !== null ? { estado: args.estado } : undefined,
        orderBy: { descripcion: "asc" },
      });
    },
  })
);







