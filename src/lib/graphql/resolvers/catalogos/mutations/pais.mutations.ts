import { builder } from "../../../builder";
import {
  CreatePaisInput,
  UpdatePaisInput,
  CreatePaisInputSchema,
  UpdatePaisInputSchema,
} from "../types/pais.types";

export const createPaisMutation = builder.mutationField("createPais", (t) =>
  t.prismaField({
    type: "tbl_pais",
    args: {
      input: t.arg({ type: CreatePaisInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const validated = CreatePaisInputSchema.parse(args.input);
      return ctx.prisma.tbl_pais.create({
        ...query,
        data: validated,
      });
    },
  })
);

export const updatePaisMutation = builder.mutationField("updatePais", (t) =>
  t.prismaField({
    type: "tbl_pais",
    args: {
      input: t.arg({ type: UpdatePaisInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idpais, ...updateData } = UpdatePaisInputSchema.parse(args.input);
      return ctx.prisma.tbl_pais.update({
        ...query,
        where: { idpais },
        data: updateData,
      });
    },
  })
);

export const deletePaisMutation = builder.mutationField("deletePais", (t) =>
  t.prismaField({
    type: "tbl_pais",
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_pais.delete({
        ...query,
        where: { idpais: args.id },
      });
    },
  })
);

