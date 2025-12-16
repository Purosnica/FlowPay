import { builder } from "../../../builder";
import {
  CreateOcupacionInput,
  UpdateOcupacionInput,
  CreateOcupacionInputSchema,
  UpdateOcupacionInputSchema,
} from "../types/ocupacion.types";

export const createOcupacionMutation = builder.mutationField("createOcupacion", (t) =>
  t.prismaField({
    type: "tbl_ocupacion",
    args: {
      input: t.arg({ type: CreateOcupacionInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const validated = CreateOcupacionInputSchema.parse(args.input);
      return ctx.prisma.tbl_ocupacion.create({
        ...query,
        data: validated,
      });
    },
  })
);

export const updateOcupacionMutation = builder.mutationField("updateOcupacion", (t) =>
  t.prismaField({
    type: "tbl_ocupacion",
    args: {
      input: t.arg({ type: UpdateOcupacionInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idocupacion, ...updateData } = UpdateOcupacionInputSchema.parse(args.input);
      return ctx.prisma.tbl_ocupacion.update({
        ...query,
        where: { idocupacion },
        data: updateData,
      });
    },
  })
);

export const deleteOcupacionMutation = builder.mutationField("deleteOcupacion", (t) =>
  t.prismaField({
    type: "tbl_ocupacion",
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_ocupacion.delete({
        ...query,
        where: { idocupacion: args.id },
      });
    },
  })
);

