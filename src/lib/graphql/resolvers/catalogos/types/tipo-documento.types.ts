import { builder } from "../../../builder";
import { z } from "zod";

// Schema de validación Zod
export const CreateTipoDocumentoInputSchema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida"),
  estado: z.boolean().default(true),
});

export const UpdateTipoDocumentoInputSchema = CreateTipoDocumentoInputSchema.partial().extend({
  idtipodocumento: z.number().int().positive(),
});

// Input types para GraphQL
export const CreateTipoDocumentoInput = builder.inputRef("CreateTipoDocumentoInput").implement({
  fields: (t) => ({
    descripcion: t.string({ required: true }),
    estado: t.boolean({ required: false, defaultValue: true }),
  }),
});

export const UpdateTipoDocumentoInput = builder.inputRef("UpdateTipoDocumentoInput").implement({
  fields: (t) => ({
    idtipodocumento: t.int({ required: true }),
    descripcion: t.string({ required: false }),
    estado: t.boolean({ required: false }),
  }),
});

// Tipo GraphQL (Prisma Object)
export const TipoDocumento = builder.prismaObject("tbl_tipodocumento", {
  fields: (t: any) => ({
    idtipodocumento: t.exposeInt("idtipodocumento"),
    descripcion: t.exposeString("descripcion"),
    estado: t.exposeBoolean("estado"),
  }),
});

