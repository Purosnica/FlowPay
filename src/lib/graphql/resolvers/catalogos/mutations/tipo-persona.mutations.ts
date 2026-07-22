import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder ,type  GraphQLContext } from "../../../builder";

import { authCatalogoEscritura } from "@/lib/graphql/auth-helpers";
import {
  CreateTipoPersonaInput,
  UpdateTipoPersonaInput,
  CreateTipoPersonaInputSchema,
  UpdateTipoPersonaInputSchema,
  TipoPersona,
} from "../types/tipo-persona.types";
import { IdArgsSchema } from "@/lib/validators/graphql-args";

export const createTipoPersonaMutation = builder.mutationField("createTipoPersona", (t) =>
  t.prismaField({
    type: TipoPersona,
    args: {
      input: t.arg({ type: CreateTipoPersonaInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const validated = CreateTipoPersonaInputSchema.parse(args.input);
      return ctx.prisma.tbl_tipopersona.create({
        ...spreadPrismaQuery(query),
        data: validated,
      }) as never;
    },
  })
);

export const updateTipoPersonaMutation = builder.mutationField("updateTipoPersona", (t) =>
  t.prismaField({
    type: TipoPersona,
    args: {
      input: t.arg({ type: UpdateTipoPersonaInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const { idtipopersona, ...updateData } = UpdateTipoPersonaInputSchema.parse(args.input);
      return ctx.prisma.tbl_tipopersona.update({
        ...spreadPrismaQuery(query),
        where: { idtipopersona },
        data: updateData,
      }) as never;
    },
  })
);

export const deleteTipoPersonaMutation = builder.mutationField("deleteTipoPersona", (t) =>
  t.prismaField({
    type: TipoPersona,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const { id } = IdArgsSchema.parse(args);
      return ctx.prisma.tbl_tipopersona.delete({
        ...spreadPrismaQuery(query),
        where: { idtipopersona: id },
      }) as never;
    },
  })
);







