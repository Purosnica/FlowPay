import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder ,type  GraphQLContext } from "../../../builder";

import { authCatalogoEscritura } from "@/lib/graphql/auth-helpers";
import {
  CreateTipoDocumentoInput,
  UpdateTipoDocumentoInput,
  CreateTipoDocumentoInputSchema,
  UpdateTipoDocumentoInputSchema,
  TipoDocumento,
} from "../types/tipo-documento.types";
import { IdArgsSchema } from "@/lib/validators/graphql-args";

export const createTipoDocumentoMutation = builder.mutationField("createTipoDocumento", (t) =>
  t.prismaField({
    type: TipoDocumento,
    args: {
      input: t.arg({ type: CreateTipoDocumentoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const validated = CreateTipoDocumentoInputSchema.parse(args.input);
      return ctx.prisma.tbl_tipodocumento.create({
        ...spreadPrismaQuery(query),
        data: validated,
      }) as never;
    },
  })
);

export const updateTipoDocumentoMutation = builder.mutationField("updateTipoDocumento", (t) =>
  t.prismaField({
    type: TipoDocumento,
    args: {
      input: t.arg({ type: UpdateTipoDocumentoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const { idtipodocumento, ...updateData } = UpdateTipoDocumentoInputSchema.parse(args.input);
      return ctx.prisma.tbl_tipodocumento.update({
        ...spreadPrismaQuery(query),
        where: { idtipodocumento },
        data: updateData,
      }) as never;
    },
  })
);

export const deleteTipoDocumentoMutation = builder.mutationField("deleteTipoDocumento", (t) =>
  t.prismaField({
    type: TipoDocumento,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const { id } = IdArgsSchema.parse(args);
      return ctx.prisma.tbl_tipodocumento.delete({
        ...spreadPrismaQuery(query),
        where: { idtipodocumento: id },
      }) as never;
    },
  })
);







