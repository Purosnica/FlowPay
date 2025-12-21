import { builder } from "../../../builder";
import { TipoPersona } from "../types/tipo-persona.types";

export const tiposPersonaQuery = builder.queryField("tiposPersona", (t) =>
  t.prismaField({
    type: [TipoPersona],
    args: {
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_tipopersona.findMany({
        ...(query as any),
        where: args.estado !== undefined && args.estado !== null ? { estado: args.estado } : undefined,
        orderBy: { descripcion: "asc" },
      });
    },
  })
);







