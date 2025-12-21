import { builder } from "../../../builder";
import {
  CreateDepartamentoInput,
  UpdateDepartamentoInput,
  CreateDepartamentoInputSchema,
  UpdateDepartamentoInputSchema,
  Departamento,
} from "../types/departamento.types";

export const createDepartamentoMutation = builder.mutationField("createDepartamento", (t) =>
  t.prismaField({
    type: Departamento,
    args: {
      input: t.arg({ type: CreateDepartamentoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const validated = CreateDepartamentoInputSchema.parse(args.input);
      return ctx.prisma.tbl_departamento.create({
        ...(query as any),
        data: validated,
      }) as any;
    },
  })
);

export const updateDepartamentoMutation = builder.mutationField("updateDepartamento", (t) =>
  t.prismaField({
    type: Departamento,
    args: {
      input: t.arg({ type: UpdateDepartamentoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { iddepartamento, ...updateData } = UpdateDepartamentoInputSchema.parse(args.input);
      return ctx.prisma.tbl_departamento.update({
        ...(query as any),
        where: { iddepartamento },
        data: updateData,
      }) as any;
    },
  })
);

export const deleteDepartamentoMutation = builder.mutationField("deleteDepartamento", (t) =>
  t.prismaField({
    type: Departamento,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_departamento.delete({
        ...(query as any),
        where: { iddepartamento: args.id },
      }) as any;
    },
  })
);







