import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder ,type  GraphQLContext } from "../../../builder";

import { authCatalogoEscritura } from "@/lib/graphql/auth-helpers";
import {
  CreateGeneroInput,
  UpdateGeneroInput,
  CreateGeneroInputSchema,
  UpdateGeneroInputSchema,
  Genero,
} from "../types/genero.types";
import { IdArgsSchema } from "@/lib/validators/graphql-args";

export const createGeneroMutation = builder.mutationField("createGenero", (t) =>
  t.prismaField({
    type: Genero,
    args: {
      input: t.arg({ type: CreateGeneroInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const validated = CreateGeneroInputSchema.parse(args.input);
      return ctx.prisma.tbl_genero.create({
        ...spreadPrismaQuery(query),
        data: validated,
      }) as never;
    },
  })
);

export const updateGeneroMutation = builder.mutationField("updateGenero", (t) =>
  t.prismaField({
    type: Genero,
    args: {
      input: t.arg({ type: UpdateGeneroInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const { idgenero, ...updateData } = UpdateGeneroInputSchema.parse(args.input);
      return ctx.prisma.tbl_genero.update({
        ...spreadPrismaQuery(query),
        where: { idgenero },
        data: updateData,
      }) as never;
    },
  })
);

export const deleteGeneroMutation = builder.mutationField("deleteGenero", (t) =>
  t.prismaField({
    type: Genero,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const { id } = IdArgsSchema.parse(args);
      return ctx.prisma.tbl_genero.delete({
        ...spreadPrismaQuery(query),
        where: { idgenero: id },
      }) as never;
    },
  })
);







