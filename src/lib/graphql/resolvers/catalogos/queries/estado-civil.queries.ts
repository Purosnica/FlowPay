import { builder } from "../../../builder";
import { EstadoCivil } from "../types/estado-civil.types";

export const estadosCivilesQuery = builder.queryField("estadosCiviles", (t) =>
  t.prismaField({
    type: [EstadoCivil],
    args: {
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_estadocivil.findMany({
        ...query,
        where: args.estado !== undefined ? { estado: args.estado } : undefined,
        orderBy: { descripcion: "asc" },
      });
    },
  })
);

