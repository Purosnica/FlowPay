import { builder } from "../../../builder";
import {
  CreatePaisInput,
  UpdatePaisInput,
  CreatePaisInputSchema,
  UpdatePaisInputSchema,
  Pais,
} from "../types/pais.types";

export const createPaisMutation = builder.mutationField("createPais", (t) =>
  t.prismaField({
    type: Pais,
    args: {
      input: t.arg({ type: CreatePaisInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const validated = CreatePaisInputSchema.parse(args.input);
      return ctx.prisma.tbl_pais.create({
        ...(query as any),
        data: validated,
      }) as any;
    },
  })
);

export const updatePaisMutation = builder.mutationField("updatePais", (t) =>
  t.prismaField({
    type: Pais,
    args: {
      input: t.arg({ type: UpdatePaisInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idpais, ...updateData } = UpdatePaisInputSchema.parse(args.input);
      return ctx.prisma.tbl_pais.update({
        ...(query as any),
        where: { idpais },
        data: updateData,
      }) as any;
    },
  })
);

export const deletePaisMutation = builder.mutationField("deletePais", (t) =>
  t.prismaField({
    type: Pais,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_pais.delete({
        ...(query as any),
        where: { idpais: args.id },
      }) as any;
    },
  })
);







