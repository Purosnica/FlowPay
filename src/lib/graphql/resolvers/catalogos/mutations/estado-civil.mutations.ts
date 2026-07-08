import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder ,type  GraphQLContext } from "../../../builder";

import { authCatalogoEscritura } from "@/lib/graphql/auth-helpers";
import {
  CreateEstadoCivilInput,
  UpdateEstadoCivilInput,
  CreateEstadoCivilInputSchema,
  UpdateEstadoCivilInputSchema,
  EstadoCivil,
} from "../types/estado-civil.types";

export const createEstadoCivilMutation = builder.mutationField("createEstadoCivil", (t) =>
  t.prismaField({
    type: EstadoCivil,
    args: {
      input: t.arg({ type: CreateEstadoCivilInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const validated = CreateEstadoCivilInputSchema.parse(args.input);
      return ctx.prisma.tbl_estadocivil.create({
        ...spreadPrismaQuery(query),
        data: validated,
      }) as never;
    },
  })
);

export const updateEstadoCivilMutation = builder.mutationField("updateEstadoCivil", (t) =>
  t.prismaField({
    type: EstadoCivil,
    args: {
      input: t.arg({ type: UpdateEstadoCivilInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const { idestadocivil, ...updateData } = UpdateEstadoCivilInputSchema.parse(args.input);
      return ctx.prisma.tbl_estadocivil.update({
        ...spreadPrismaQuery(query),
        where: { idestadocivil },
        data: updateData,
      }) as never;
    },
  })
);

export const deleteEstadoCivilMutation = builder.mutationField("deleteEstadoCivil", (t) =>
  t.prismaField({
    type: EstadoCivil,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      return ctx.prisma.tbl_estadocivil.delete({
        ...spreadPrismaQuery(query),
        where: { idestadocivil: args.id },
      }) as never;
    },
  })
);







