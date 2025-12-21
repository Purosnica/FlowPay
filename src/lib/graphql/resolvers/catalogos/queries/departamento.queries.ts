import { builder } from "../../../builder";
import { Departamento } from "../types/departamento.types";

export const departamentosQuery = builder.queryField("departamentos", (t) =>
  t.prismaField({
    type: [Departamento],
    args: {
      idpais: t.arg.int({ required: false }),
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const where: any = {};
      if (args.idpais) {
        where.idpais = args.idpais;
      }
      if (args.estado !== undefined) {
        where.estado = args.estado;
      }
      return ctx.prisma.tbl_departamento.findMany({
        ...(query as any),
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          pais: true,
        },
        orderBy: { descripcion: "asc" },
      });
    },
  })
);







