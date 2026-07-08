import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from "../../builder";
import { z } from "zod";
import { exposeDecimal } from "../../helpers/graphql-helpers";
import type { tbl_campana, tbl_mandante } from "@prisma/client";

export const CreateMandanteInputSchema = z.object({
  codigo: z.string().min(1, "El código es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  ruc: z.string().optional(),
  regulador: z.enum(["CONAMI", "SIBOIF", "NINGUNO"]).optional(),
  descuentoMaximo: z
    .number()
    .min(0, "El descuento máximo no puede ser negativo")
    .max(100, "El descuento máximo no puede superar 100%"),
  estado: z.boolean().default(true),
});

export const UpdateMandanteInputSchema = CreateMandanteInputSchema.partial().extend({
  idmandante: z.number().int().positive(),
});

export const CreateCampanaInputSchema = z.object({
  idmandante: z.number().int().positive(),
  nombre: z.string().min(1),
  fechaCorte: z.union([z.date(), z.string()]).transform((v) =>
    typeof v === "string" ? new Date(v) : v,
  ),
});

export const CreateMandanteInput = builder.inputRef("CreateMandanteInput").implement({
  fields: (t) => ({
    codigo: t.string({ required: true }),
    nombre: t.string({ required: true }),
    ruc: t.string({ required: false }),
    regulador: t.string({ required: false }),
    descuentoMaximo: t.float({ required: true }),
    estado: t.boolean({ required: false, defaultValue: true }),
  }),
});

export const UpdateMandanteInput = builder.inputRef("UpdateMandanteInput").implement({
  fields: (t) => ({
    idmandante: t.int({ required: true }),
    codigo: t.string({ required: false }),
    nombre: t.string({ required: false }),
    ruc: t.string({ required: false }),
    regulador: t.string({ required: false }),
    descuentoMaximo: t.float({ required: false }),
    estado: t.boolean({ required: false }),
  }),
});

export const CreateCampanaInput = builder.inputRef("CreateCampanaInput").implement({
  fields: (t) => ({
    idmandante: t.int({ required: true }),
    nombre: t.string({ required: true }),
    fechaCorte: t.field({ type: "DateTime", required: true }),
  }),
});

export const Mandante = definePrismaObject("tbl_mandante", {
  fields: (t) => ({
    idmandante: t.exposeInt("idmandante"),
    codigo: t.exposeString("codigo"),
    nombre: t.exposeString("nombre"),
    ruc: t.exposeString("ruc", { nullable: true }),
    regulador: t.exposeString("regulador", { nullable: true }),
    descuentoMaximo: exposeDecimal(t, "descuentoMaximo"),
    estado: t.exposeBoolean("estado"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    updatedAt: t.expose("updatedAt", { type: "DateTime" }),
  }),
});

export const Campana = definePrismaObject("tbl_campana", {
  fields: (t) => ({
    idcampana: t.exposeInt("idcampana"),
    idmandante: t.exposeInt("idmandante"),
    nombre: t.exposeString("nombre"),
    fechaCorte: t.expose("fechaCorte", { type: "DateTime" }),
    fechaCarga: t.expose("fechaCarga", { type: "DateTime" }),
    estado: t.exposeString("estado"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
  }),
});

export const CampanaPage = builder.objectRef<{
  campanas: tbl_campana[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("CampanaPage").implement({
  fields: (t) => ({
    campanas: t.field({ type: [Campana], resolve: (p) => p.campanas }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});

export const MandantePage = builder.objectRef<{
  mandantes: tbl_mandante[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("MandantePage").implement({
  fields: (t) => ({
    mandantes: t.field({ type: [Mandante], resolve: (parent) => parent.mandantes }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});
