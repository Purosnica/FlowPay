import { builder } from "../../../builder";
import {
  CreateDepartamentoInput,
  UpdateDepartamentoInput,
  CreateDepartamentoInputSchema,
  UpdateDepartamentoInputSchema,
} from "../types/departamento.types";

export const createDepartamentoMutation = builder.mutationField("createDepartamento", (t) =>
  t.prismaField({
    type: "tbl_departamento",
    args: {
      input: t.arg({ type: CreateDepartamentoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const validated = CreateDepartamentoInputSchema.parse(args.input);
      return ctx.prisma.tbl_departamento.create({
        ...query,
        data: validated,
        include: {
          pais: true,
        },
      });
    },
  })
);

export const updateDepartamentoMutation = builder.mutationField("updateDepartamento", (t) =>
  t.prismaField({
    type: "tbl_departamento",
    args: {
      input: t.arg({ type: UpdateDepartamentoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { iddepartamento, ...updateData } = UpdateDepartamentoInputSchema.parse(args.input);
      return ctx.prisma.tbl_departamento.update({
        ...query,
        where: { iddepartamento },
        data: updateData,
        include: {
          pais: true,
        },
      });
    },
  })
);

export const deleteDepartamentoMutation = builder.mutationField("deleteDepartamento", (t) =>
  t.prismaField({
    type: "tbl_departamento",
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_departamento.delete({
        ...query,
        where: { iddepartamento: args.id },
        include: {
          pais: true,
        },
      });
    },
  })
);

