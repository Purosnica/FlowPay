import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder } from "../../../builder";
import { Departamento } from "../types/departamento.types";
import { authCatalogoLectura } from "@/lib/graphql/auth-helpers";

export const departamentosQuery = builder.queryField("departamentos", (t) =>
  t.prismaField({
    type: [Departamento],
    args: {
      idpais: t.arg.int({ required: false }),
      estado: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _parent, args, ctx) => {
      await authCatalogoLectura(ctx);
      const where: { idpais?: number; estado?: boolean } = {};
      if (args.idpais) {
        where.idpais = args.idpais;
      }
      if (args.estado != null) {
        where.estado = args.estado;
      }
      return ctx.prisma.tbl_departamento.findMany({
        ...spreadPrismaQuery(query),
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          pais: true,
        },
        orderBy: { descripcion: "asc" },
      });
    },
  })
);







