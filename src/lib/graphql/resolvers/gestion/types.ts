import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from "../../builder";
import { z } from "zod";
import { exposeDecimal } from "../../helpers/graphql-helpers";
import type { tbl_gestion } from "@prisma/client";

export const CreateGestionInputSchema = z.object({
  idprestamo: z.number().int().positive(),
  idcodaccion: z.number().int().positive().optional(),
  idcodresultado: z.number().int().positive().optional(),
  telefonoContacto: z.string().optional(),
  contactoTercero: z.boolean().default(false),
  nota: z.string().min(1, "La nota de gestión es requerida"),
  razonMora: z.string().optional(),
  montoPromesa: z.number().positive().optional(),
  fechaPromesa: z.union([z.date(), z.string()]).optional().transform((v) =>
    v ? (typeof v === "string" ? new Date(v) : v) : undefined,
  ),
  fechaProximaGestion: z.union([z.date(), z.string()]).optional().transform((v) =>
    v ? (typeof v === "string" ? new Date(v) : v) : undefined,
  ),
  comentario: z.string().optional(),
  latitud: z.number().optional(),
  longitud: z.number().optional(),
  idempotencyKey: z
    .string()
    .trim()
    .min(8)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "idempotencyKey inválida")
    .optional(),
});

export const CreateGestionInput = builder.inputRef("CreateGestionInput").implement({
  fields: (t) => ({
    idprestamo: t.int({ required: true }),
    idcodaccion: t.int({ required: false }),
    idcodresultado: t.int({ required: false }),
    telefonoContacto: t.string({ required: false }),
    contactoTercero: t.boolean({ required: false, defaultValue: false }),
    nota: t.string({ required: true }),
    razonMora: t.string({ required: false }),
    montoPromesa: t.float({ required: false }),
    fechaPromesa: t.field({ type: "DateTime", required: false }),
    fechaProximaGestion: t.field({ type: "DateTime", required: false }),
    comentario: t.string({ required: false }),
    latitud: t.float({ required: false }),
    longitud: t.float({ required: false }),
    idempotencyKey: t.string({ required: false }),
  }),
});

export const Gestion = definePrismaObject("tbl_gestion", {
  fields: (t) => ({
    idgestion: t.exposeInt("idgestion"),
    idmandante: t.exposeInt("idmandante"),
    idprestamo: t.exposeInt("idprestamo"),
    idgestor: t.exposeInt("idgestor"),
    idcodaccion: t.exposeInt("idcodaccion", { nullable: true }),
    idcodresultado: t.exposeInt("idcodresultado", { nullable: true }),
    fechaGestion: t.expose("fechaGestion", { type: "DateTime" }),
    telefonoContacto: t.exposeString("telefonoContacto", { nullable: true }),
    contactoTercero: t.exposeBoolean("contactoTercero"),
    nota: t.exposeString("nota"),
    razonMora: t.exposeString("razonMora", { nullable: true }),
    montoPromesa: exposeDecimal(t, "montoPromesa"),
    fechaPromesa: t.expose("fechaPromesa", { type: "DateTime", nullable: true }),
    estadoPromesa: t.exposeString("estadoPromesa", { nullable: true }),
    fechaProximaGestion: t.expose("fechaProximaGestion", { type: "DateTime", nullable: true }),
    comentario: t.exposeString("comentario", { nullable: true }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    gestor: t.relation("gestor"),
    codaccion: t.relation("codaccion", { nullable: true }),
    codresult: t.relation("codresult", { nullable: true }),
    prestamo: t.relation("prestamo"),
  }),
});

export const GestionPage = builder.objectRef<{
  gestiones: tbl_gestion[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("GestionPage").implement({
  fields: (t) => ({
    gestiones: t.field({ type: [Gestion], resolve: (p) => p.gestiones }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});

export const PromesaVencidaType = builder
  .objectRef<{
    idgestion: number;
    idprestamo: number;
    noPrestamo: string;
    nombreCliente: string;
    montoPromesa: number;
    fechaPromesa: Date;
    diasVencidos: number;
  }>('PromesaVencida')
  .implement({
    fields: (t) => ({
      idgestion: t.exposeInt('idgestion'),
      idprestamo: t.exposeInt('idprestamo'),
      noPrestamo: t.exposeString('noPrestamo'),
      nombreCliente: t.exposeString('nombreCliente'),
      montoPromesa: t.exposeFloat('montoPromesa'),
      fechaPromesa: t.expose('fechaPromesa', { type: 'DateTime' }),
      diasVencidos: t.exposeInt('diasVencidos'),
    }),
  });
