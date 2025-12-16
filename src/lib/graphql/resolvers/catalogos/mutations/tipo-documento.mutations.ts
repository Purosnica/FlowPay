import { builder } from "../../../builder";
import {
  CreateTipoDocumentoInput,
  UpdateTipoDocumentoInput,
  CreateTipoDocumentoInputSchema,
  UpdateTipoDocumentoInputSchema,
} from "../types/tipo-documento.types";

export const createTipoDocumentoMutation = builder.mutationField("createTipoDocumento", (t) =>
  t.prismaField({
    type: "tbl_tipodocumento",
    args: {
      input: t.arg({ type: CreateTipoDocumentoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const validated = CreateTipoDocumentoInputSchema.parse(args.input);
      return ctx.prisma.tbl_tipodocumento.create({
        ...query,
        data: validated,
      });
    },
  })
);

export const updateTipoDocumentoMutation = builder.mutationField("updateTipoDocumento", (t) =>
  t.prismaField({
    type: "tbl_tipodocumento",
    args: {
      input: t.arg({ type: UpdateTipoDocumentoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const { idtipodocumento, ...updateData } = UpdateTipoDocumentoInputSchema.parse(args.input);
      return ctx.prisma.tbl_tipodocumento.update({
        ...query,
        where: { idtipodocumento },
        data: updateData,
      });
    },
  })
);

export const deleteTipoDocumentoMutation = builder.mutationField("deleteTipoDocumento", (t) =>
  t.prismaField({
    type: "tbl_tipodocumento",
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      return ctx.prisma.tbl_tipodocumento.delete({
        ...query,
        where: { idtipodocumento: args.id },
      });
    },
  })
);

