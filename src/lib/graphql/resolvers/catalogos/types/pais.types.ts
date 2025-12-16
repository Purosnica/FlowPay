import { builder } from "../../../builder";
import { z } from "zod";

// Schema de validación Zod
export const CreatePaisInputSchema = z.object({
  codepais: z.string().min(1, "El código de país es requerido"),
  descripcion: z.string().min(1, "La descripción es requerida"),
  estado: z.boolean().default(true),
});

export const UpdatePaisInputSchema = CreatePaisInputSchema.partial().extend({
  idpais: z.number().int().positive(),
});

// Input types para GraphQL
export const CreatePaisInput = builder.inputRef("CreatePaisInput").implement({
  fields: (t) => ({
    codepais: t.string({ required: true }),
    descripcion: t.string({ required: true }),
    estado: t.boolean({ required: false, defaultValue: true }),
  }),
});

export const UpdatePaisInput = builder.inputRef("UpdatePaisInput").implement({
  fields: (t) => ({
    idpais: t.int({ required: true }),
    codepais: t.string({ required: false }),
    descripcion: t.string({ required: false }),
    estado: t.boolean({ required: false }),
  }),
});

// Tipo GraphQL (Prisma Object)
export const Pais = builder.prismaObject("tbl_pais", {
  fields: (t: any) => ({
    idpais: t.exposeInt("idpais"),
    codepais: t.exposeString("codepais"),
    descripcion: t.exposeString("descripcion"),
    estado: t.exposeBoolean("estado"),
  }),
});

