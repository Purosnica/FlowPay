import { builder } from "../../../builder";
import { z } from "zod";

// Schema de validación Zod
export const CreateOcupacionInputSchema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida"),
  estado: z.boolean().default(true),
});

export const UpdateOcupacionInputSchema = CreateOcupacionInputSchema.partial().extend({
  idocupacion: z.number().int().positive(),
});

// Input types para GraphQL
export const CreateOcupacionInput = builder.inputRef("CreateOcupacionInput").implement({
  fields: (t) => ({
    descripcion: t.string({ required: true }),
    estado: t.boolean({ required: false, defaultValue: true }),
  }),
});

export const UpdateOcupacionInput = builder.inputRef("UpdateOcupacionInput").implement({
  fields: (t) => ({
    idocupacion: t.int({ required: true }),
    descripcion: t.string({ required: false }),
    estado: t.boolean({ required: false }),
  }),
});

// Tipo GraphQL (Prisma Object)
export const Ocupacion = builder.prismaObject("tbl_ocupacion" as any, {
  fields: (t: any) => ({
    idocupacion: t.exposeInt("idocupacion"),
    descripcion: t.exposeString("descripcion"),
    estado: t.exposeBoolean("estado"),
  }),
});







