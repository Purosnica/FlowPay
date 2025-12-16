import { builder } from "../../../builder";
import {
  CreateGeneroInput,
  UpdateGeneroInput,
  CreateGeneroInputSchema,
  UpdateGeneroInputSchema,
} from "../types/genero.types";

export const createGeneroMutation = builder.mutationField("createGenero", (t) =>
  t.prismaField({
    type: "tbl_genero",
    args: {
      input: t.arg({ type: CreateGeneroInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const validated = CreateGeneroInputSchema.parse(args.input);
      return ctx.prisma.tbl_genero.create({
        ...query,
        data: validated,
      });
    },
  })
);

export const updateGeneroMutation = builder.mutationField("updateGenero", (t) =>
  t.prismaField({
    type: "tbl_genero",
    args: {
      input: t.arg({ type: UpdateGeneroInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idgenero, ...updateData } = UpdateGeneroInputSchema.parse(args.input);
      return ctx.prisma.tbl_genero.update({
        ...query,
        where: { idgenero },
        data: updateData,
      });
    },
  })
);

export const deleteGeneroMutation = builder.mutationField("deleteGenero", (t) =>
  t.prismaField({
    type: "tbl_genero",
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_genero.delete({
        ...query,
        where: { idgenero: args.id },
      });
    },
  })
);

