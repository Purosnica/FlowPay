import { builder } from "../../../builder";
import { z } from "zod";

// Schema de validación Zod
export const CreateTipoPersonaInputSchema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida"),
  estado: z.boolean().default(true),
});

export const UpdateTipoPersonaInputSchema = CreateTipoPersonaInputSchema.partial().extend({
  idtipopersona: z.number().int().positive(),
});

// Input types para GraphQL
export const CreateTipoPersonaInput = builder.inputRef("CreateTipoPersonaInput").implement({
  fields: (t) => ({
    descripcion: t.string({ required: true }),
    estado: t.boolean({ required: false, defaultValue: true }),
  }),
});

export const UpdateTipoPersonaInput = builder.inputRef("UpdateTipoPersonaInput").implement({
  fields: (t) => ({
    idtipopersona: t.int({ required: true }),
    descripcion: t.string({ required: false }),
    estado: t.boolean({ required: false }),
  }),
});

// Tipo GraphQL (Prisma Object)
export const TipoPersona = builder.prismaObject("tbl_tipopersona", {
  fields: (t: any) => ({
    idtipopersona: t.exposeInt("idtipopersona"),
    descripcion: t.exposeString("descripcion"),
    estado: t.exposeBoolean("estado"),
  }),
});

