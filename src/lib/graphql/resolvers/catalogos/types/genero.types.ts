import { builder } from "../../../builder";
import { z } from "zod";

// Schema de validación Zod
export const CreateGeneroInputSchema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida"),
  estado: z.boolean().default(true),
});

export const UpdateGeneroInputSchema = CreateGeneroInputSchema.partial().extend({
  idgenero: z.number().int().positive(),
});

// Input types para GraphQL
export const CreateGeneroInput = builder.inputRef("CreateGeneroInput").implement({
  fields: (t) => ({
    descripcion: t.string({ required: true }),
    estado: t.boolean({ required: false, defaultValue: true }),
  }),
});

export const UpdateGeneroInput = builder.inputRef("UpdateGeneroInput").implement({
  fields: (t) => ({
    idgenero: t.int({ required: true }),
    descripcion: t.string({ required: false }),
    estado: t.boolean({ required: false }),
  }),
});

// Tipo GraphQL (Prisma Object)
export const Genero = builder.prismaObject("tbl_genero" as any, {
  fields: (t: any) => ({
    idgenero: t.exposeInt("idgenero"),
    descripcion: t.exposeString("descripcion"),
    estado: t.exposeBoolean("estado"),
  }),
});







