import { builder } from "../../../builder";
import {
  CreateTipoPersonaInput,
  UpdateTipoPersonaInput,
  CreateTipoPersonaInputSchema,
  UpdateTipoPersonaInputSchema,
} from "../types/tipo-persona.types";

export const createTipoPersonaMutation = builder.mutationField("createTipoPersona", (t) =>
  t.prismaField({
    type: "tbl_tipopersona",
    args: {
      input: t.arg({ type: CreateTipoPersonaInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const validated = CreateTipoPersonaInputSchema.parse(args.input);
      return ctx.prisma.tbl_tipopersona.create({
        ...query,
        data: validated,
      });
    },
  })
);

export const updateTipoPersonaMutation = builder.mutationField("updateTipoPersona", (t) =>
  t.prismaField({
    type: "tbl_tipopersona",
    args: {
      input: t.arg({ type: UpdateTipoPersonaInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idtipopersona, ...updateData } = UpdateTipoPersonaInputSchema.parse(args.input);
      return ctx.prisma.tbl_tipopersona.update({
        ...query,
        where: { idtipopersona },
        data: updateData,
      });
    },
  })
);

export const deleteTipoPersonaMutation = builder.mutationField("deleteTipoPersona", (t) =>
  t.prismaField({
    type: "tbl_tipopersona",
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_tipopersona.delete({
        ...query,
        where: { idtipopersona: args.id },
      });
    },
  })
);

