import { builder } from "../../../builder";
import { z } from "zod";

// Schema de validación Zod
export const CreateEstadoCivilInputSchema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida"),
  estado: z.boolean().default(true),
});

export const UpdateEstadoCivilInputSchema = CreateEstadoCivilInputSchema.partial().extend({
  idestadocivil: z.number().int().positive(),
});

// Input types para GraphQL
export const CreateEstadoCivilInput = builder.inputRef("CreateEstadoCivilInput").implement({
  fields: (t) => ({
    descripcion: t.string({ required: true }),
    estado: t.boolean({ required: false, defaultValue: true }),
  }),
});

export const UpdateEstadoCivilInput = builder.inputRef("UpdateEstadoCivilInput").implement({
  fields: (t) => ({
    idestadocivil: t.int({ required: true }),
    descripcion: t.string({ required: false }),
    estado: t.boolean({ required: false }),
  }),
});

// Tipo GraphQL (Prisma Object)
export const EstadoCivil = builder.prismaObject("tbl_estadocivil" as any, {
  fields: (t: any) => ({
    idestadocivil: t.exposeInt("idestadocivil"),
    descripcion: t.exposeString("descripcion"),
    estado: t.exposeBoolean("estado"),
  }),
});







