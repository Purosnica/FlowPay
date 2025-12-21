import { builder } from "../../../builder";
import {
  CreateTipoPersonaInput,
  UpdateTipoPersonaInput,
  CreateTipoPersonaInputSchema,
  UpdateTipoPersonaInputSchema,
  TipoPersona,
} from "../types/tipo-persona.types";

export const createTipoPersonaMutation = builder.mutationField("createTipoPersona", (t) =>
  t.prismaField({
    type: TipoPersona,
    args: {
      input: t.arg({ type: CreateTipoPersonaInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const validated = CreateTipoPersonaInputSchema.parse(args.input);
      return ctx.prisma.tbl_tipopersona.create({
        ...(query as any),
        data: validated,
      }) as any;
    },
  })
);

export const updateTipoPersonaMutation = builder.mutationField("updateTipoPersona", (t) =>
  t.prismaField({
    type: TipoPersona,
    args: {
      input: t.arg({ type: UpdateTipoPersonaInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idtipopersona, ...updateData } = UpdateTipoPersonaInputSchema.parse(args.input);
      return ctx.prisma.tbl_tipopersona.update({
        ...(query as any),
        where: { idtipopersona },
        data: updateData,
      }) as any;
    },
  })
);

export const deleteTipoPersonaMutation = builder.mutationField("deleteTipoPersona", (t) =>
  t.prismaField({
    type: TipoPersona,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_tipopersona.delete({
        ...(query as any),
        where: { idtipopersona: args.id },
      }) as any;
    },
  })
);







