import { builder } from "../../../builder";
import {
  CreateEstadoCivilInput,
  UpdateEstadoCivilInput,
  CreateEstadoCivilInputSchema,
  UpdateEstadoCivilInputSchema,
  EstadoCivil,
} from "../types/estado-civil.types";

export const createEstadoCivilMutation = builder.mutationField("createEstadoCivil", (t) =>
  t.prismaField({
    type: EstadoCivil,
    args: {
      input: t.arg({ type: CreateEstadoCivilInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const validated = CreateEstadoCivilInputSchema.parse(args.input);
      return ctx.prisma.tbl_estadocivil.create({
        ...(query as any),
        data: validated,
      }) as any;
    },
  })
);

export const updateEstadoCivilMutation = builder.mutationField("updateEstadoCivil", (t) =>
  t.prismaField({
    type: EstadoCivil,
    args: {
      input: t.arg({ type: UpdateEstadoCivilInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idestadocivil, ...updateData } = UpdateEstadoCivilInputSchema.parse(args.input);
      return ctx.prisma.tbl_estadocivil.update({
        ...(query as any),
        where: { idestadocivil },
        data: updateData,
      }) as any;
    },
  })
);

export const deleteEstadoCivilMutation = builder.mutationField("deleteEstadoCivil", (t) =>
  t.prismaField({
    type: EstadoCivil,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_estadocivil.delete({
        ...(query as any),
        where: { idestadocivil: args.id },
      }) as any;
    },
  })
);







