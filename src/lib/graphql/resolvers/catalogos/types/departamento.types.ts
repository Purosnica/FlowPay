import { builder } from "../../../builder";
import { z } from "zod";

// Schema de validación Zod
export const CreateDepartamentoInputSchema = z.object({
  idpais: z.number().int().positive("El país es requerido"),
  descripcion: z.string().min(1, "La descripción es requerida"),
  estado: z.boolean().default(true),
});

export const UpdateDepartamentoInputSchema = CreateDepartamentoInputSchema.partial().extend({
  iddepartamento: z.number().int().positive(),
});

// Input types para GraphQL
export const CreateDepartamentoInput = builder.inputRef("CreateDepartamentoInput").implement({
  fields: (t) => ({
    idpais: t.int({ required: true }),
    descripcion: t.string({ required: true }),
    estado: t.boolean({ required: false, defaultValue: true }),
  }),
});

export const UpdateDepartamentoInput = builder.inputRef("UpdateDepartamentoInput").implement({
  fields: (t) => ({
    iddepartamento: t.int({ required: true }),
    idpais: t.int({ required: false }),
    descripcion: t.string({ required: false }),
    estado: t.boolean({ required: false }),
  }),
});

// Tipo GraphQL (Prisma Object)
export const Departamento = builder.prismaObject("tbl_departamento", {
  fields: (t: any) => ({
    iddepartamento: t.exposeInt("iddepartamento"),
    idpais: t.exposeInt("idpais"),
    descripcion: t.exposeString("descripcion"),
    estado: t.exposeBoolean("estado"),
    pais: t.relation("pais"),
  }),
});

