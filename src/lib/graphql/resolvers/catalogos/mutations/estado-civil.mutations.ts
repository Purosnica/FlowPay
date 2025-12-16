import { builder } from "../../../builder";
import {
  CreateEstadoCivilInput,
  UpdateEstadoCivilInput,
  CreateEstadoCivilInputSchema,
  UpdateEstadoCivilInputSchema,
} from "../types/estado-civil.types";

export const createEstadoCivilMutation = builder.mutationField("createEstadoCivil", (t) =>
  t.prismaField({
    type: "tbl_estadocivil",
    args: {
      input: t.arg({ type: CreateEstadoCivilInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const validated = CreateEstadoCivilInputSchema.parse(args.input);
      return ctx.prisma.tbl_estadocivil.create({
        ...query,
        data: validated,
      });
    },
  })
);

export const updateEstadoCivilMutation = builder.mutationField("updateEstadoCivil", (t) =>
  t.prismaField({
    type: "tbl_estadocivil",
    args: {
      input: t.arg({ type: UpdateEstadoCivilInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idestadocivil, ...updateData } = UpdateEstadoCivilInputSchema.parse(args.input);
      return ctx.prisma.tbl_estadocivil.update({
        ...query,
        where: { idestadocivil },
        data: updateData,
      });
    },
  })
);

export const deleteEstadoCivilMutation = builder.mutationField("deleteEstadoCivil", (t) =>
  t.prismaField({
    type: "tbl_estadocivil",
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_estadocivil.delete({
        ...query,
        where: { idestadocivil: args.id },
      });
    },
  })
);

