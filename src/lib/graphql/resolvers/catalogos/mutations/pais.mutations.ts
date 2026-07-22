import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder ,type  GraphQLContext } from "../../../builder";

import { authCatalogoEscritura } from "@/lib/graphql/auth-helpers";
import {
  CreatePaisInput,
  UpdatePaisInput,
  CreatePaisInputSchema,
  UpdatePaisInputSchema,
  Pais,
} from "../types/pais.types";
import { IdArgsSchema } from "@/lib/validators/graphql-args";

export const createPaisMutation = builder.mutationField("createPais", (t) =>
  t.prismaField({
    type: Pais,
    args: {
      input: t.arg({ type: CreatePaisInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const validated = CreatePaisInputSchema.parse(args.input);
      return ctx.prisma.tbl_pais.create({
        ...spreadPrismaQuery(query),
        data: validated,
      }) as never;
    },
  })
);

export const updatePaisMutation = builder.mutationField("updatePais", (t) =>
  t.prismaField({
    type: Pais,
    args: {
      input: t.arg({ type: UpdatePaisInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const { idpais, ...updateData } = UpdatePaisInputSchema.parse(args.input);
      return ctx.prisma.tbl_pais.update({
        ...spreadPrismaQuery(query),
        where: { idpais },
        data: updateData,
      }) as never;
    },
  })
);

export const deletePaisMutation = builder.mutationField("deletePais", (t) =>
  t.prismaField({
    type: Pais,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const { id } = IdArgsSchema.parse(args);
      return ctx.prisma.tbl_pais.delete({
        ...spreadPrismaQuery(query),
        where: { idpais: id },
      }) as never;
    },
  })
);







