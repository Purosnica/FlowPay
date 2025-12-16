import { builder } from "../../../builder";
import { Ocupacion } from "../types/ocupacion.types";

export const ocupacionesQuery = builder.queryField("ocupaciones", (t) =>
  t.prismaField({
    type: [Ocupacion],
    args: {
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_ocupacion.findMany({
        ...query,
        where: args.estado !== undefined ? { estado: args.estado } : undefined,
        orderBy: { descripcion: "asc" },
      });
    },
  })
);

