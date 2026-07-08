import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from "../../builder";
import { z } from "zod";

// ======================================================
// TIPOS PARA CONFIGURACIÓN DEL SISTEMA
// ======================================================

export const ConfiguracionSistema = definePrismaObject(
  "tbl_configuracion_sistema",
  {
    fields: (t) => ({
      idconfiguracion: t.exposeInt("idconfiguracion"),
      clave: t.exposeString("clave"),
      valor: t.exposeString("valor"),
      tipo: t.exposeString("tipo"),
      descripcion: t.exposeString("descripcion", { nullable: true }),
      categoria: t.exposeString("categoria", { nullable: true }),
      idusuarioMod: t.exposeInt("idusuarioMod", { nullable: true }),
      deletedAt: t.field({
        type: "DateTime",
        nullable: true,
        resolve: (parent: Record<string, unknown>) => parent.deletedAt,
      }),
      createdAt: t.field({
        type: "DateTime",
        resolve: (parent: Record<string, unknown>) => parent.createdAt,
      }),
      updatedAt: t.field({
        type: "DateTime",
        resolve: (parent: Record<string, unknown>) => parent.updatedAt,
      }),
      usuarioMod: t.relation("usuarioMod", { nullable: true }),
    }),
  }
);

export const UpdateConfiguracionInputSchema = z.object({
  clave: z.string().min(1),
  valor: z.string().min(1),
  idusuarioMod: z.number().int().positive().optional(),
});

export const UpdateConfiguracionInput = builder
  .inputRef("UpdateConfiguracionInput")
  .implement({
    fields: (t) => ({
      clave: t.string({ required: true }),
      valor: t.string({ required: true }),
      idusuarioMod: t.int({ required: false }),
    }),
  });

export const BulkUpdateConfiguracionInputSchema = z.object({
  configuraciones: z.array(
    z.object({
      clave: z.string().min(1),
      valor: z.string().min(1),
    })
  ),
  idusuarioMod: z.number().int().positive().optional(),
});

export const BulkUpdateConfiguracionInput = builder
  .inputRef("BulkUpdateConfiguracionInput")
  .implement({
    fields: (t) => ({
      configuraciones: t.field({
        type: [
          builder.inputRef("ConfiguracionItemInput").implement({
            fields: (t) => ({
              clave: t.string({ required: true }),
              valor: t.string({ required: true }),
            }),
          }),
        ],
        required: true,
      }),
      idusuarioMod: t.int({ required: false }),
    }),
  });
