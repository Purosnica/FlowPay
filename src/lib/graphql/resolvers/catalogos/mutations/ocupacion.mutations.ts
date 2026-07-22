import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder ,type  GraphQLContext } from "../../../builder";

import { authCatalogoEscritura } from "@/lib/graphql/auth-helpers";
import {
  CreateOcupacionInput,
  UpdateOcupacionInput,
  CreateOcupacionInputSchema,
  UpdateOcupacionInputSchema,
  Ocupacion,
} from "../types/ocupacion.types";
import { IdArgsSchema } from "@/lib/validators/graphql-args";

export const createOcupacionMutation = builder.mutationField("createOcupacion", (t) =>
  t.prismaField({
    type: Ocupacion,
    args: {
      input: t.arg({ type: CreateOcupacionInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const validated = CreateOcupacionInputSchema.parse(args.input);
      return ctx.prisma.tbl_ocupacion.create({
        ...spreadPrismaQuery(query),
        data: validated,
      }) as never;
    },
  })
);

export const updateOcupacionMutation = builder.mutationField("updateOcupacion", (t) =>
  t.prismaField({
    type: Ocupacion,
    args: {
      input: t.arg({ type: UpdateOcupacionInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const { idocupacion, ...updateData } = UpdateOcupacionInputSchema.parse(args.input);
      return ctx.prisma.tbl_ocupacion.update({
        ...spreadPrismaQuery(query),
        where: { idocupacion },
        data: updateData,
      }) as never;
    },
  })
);

export const deleteOcupacionMutation = builder.mutationField("deleteOcupacion", (t) =>
  t.prismaField({
    type: Ocupacion,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const { id } = IdArgsSchema.parse(args);
      return ctx.prisma.tbl_ocupacion.delete({
        ...spreadPrismaQuery(query),
        where: { idocupacion: id },
      }) as never;
    },
  })
);







