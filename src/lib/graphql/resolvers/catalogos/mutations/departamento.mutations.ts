import { spreadPrismaQuery } from "../../../helpers/prisma-query";
import { builder ,type  GraphQLContext } from "../../../builder";

import { authCatalogoEscritura } from "@/lib/graphql/auth-helpers";
import {
  CreateDepartamentoInput,
  UpdateDepartamentoInput,
  CreateDepartamentoInputSchema,
  UpdateDepartamentoInputSchema,
  Departamento,
} from "../types/departamento.types";
import { IdArgsSchema } from "@/lib/validators/graphql-args";

export const createDepartamentoMutation = builder.mutationField("createDepartamento", (t) =>
  t.prismaField({
    type: Departamento,
    args: {
      input: t.arg({ type: CreateDepartamentoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const validated = CreateDepartamentoInputSchema.parse(args.input);
      return ctx.prisma.tbl_departamento.create({
        ...spreadPrismaQuery(query),
        data: validated,
      }) as never;
    },
  })
);

export const updateDepartamentoMutation = builder.mutationField("updateDepartamento", (t) =>
  t.prismaField({
    type: Departamento,
    args: {
      input: t.arg({ type: UpdateDepartamentoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const { iddepartamento, ...updateData } = UpdateDepartamentoInputSchema.parse(args.input);
      return ctx.prisma.tbl_departamento.update({
        ...spreadPrismaQuery(query),
        where: { iddepartamento },
        data: updateData,
      }) as never;
    },
  })
);

export const deleteDepartamentoMutation = builder.mutationField("deleteDepartamento", (t) =>
  t.prismaField({
    type: Departamento,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await authCatalogoEscritura(ctx);
      const { id } = IdArgsSchema.parse(args);
      return ctx.prisma.tbl_departamento.delete({
        ...spreadPrismaQuery(query),
        where: { iddepartamento: id },
      }) as never;
    },
  })
);







