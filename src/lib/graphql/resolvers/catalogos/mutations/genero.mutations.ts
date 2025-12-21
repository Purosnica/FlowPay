import { builder } from "../../../builder";
import {
  CreateGeneroInput,
  UpdateGeneroInput,
  CreateGeneroInputSchema,
  UpdateGeneroInputSchema,
  Genero,
} from "../types/genero.types";

export const createGeneroMutation = builder.mutationField("createGenero", (t) =>
  t.prismaField({
    type: Genero,
    args: {
      input: t.arg({ type: CreateGeneroInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const validated = CreateGeneroInputSchema.parse(args.input);
      return ctx.prisma.tbl_genero.create({
        ...(query as any),
        data: validated,
      }) as any;
    },
  })
);

export const updateGeneroMutation = builder.mutationField("updateGenero", (t) =>
  t.prismaField({
    type: Genero,
    args: {
      input: t.arg({ type: UpdateGeneroInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idgenero, ...updateData } = UpdateGeneroInputSchema.parse(args.input);
      return ctx.prisma.tbl_genero.update({
        ...(query as any),
        where: { idgenero },
        data: updateData,
      }) as any;
    },
  })
);

export const deleteGeneroMutation = builder.mutationField("deleteGenero", (t) =>
  t.prismaField({
    type: Genero,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_genero.delete({
        ...(query as any),
        where: { idgenero: args.id },
      }) as any;
    },
  })
);







