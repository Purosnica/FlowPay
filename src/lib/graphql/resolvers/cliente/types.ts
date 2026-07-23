import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from "../../builder";
import { z } from "zod";
import type { tbl_cliente } from "@prisma/client";

// ============================================
// SCHEMAS DE VALIDACIÓN ZOD
// ============================================

const optionalDate = z
  .union([z.date(), z.string()])
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    return typeof val === "string" ? new Date(val) : val;
  });

export const CreateClienteInputSchema = z.object({
  /** No coercionar null→"": en updates parciales borraría nombres. */
  primer_nombres: z.string().nullish(),
  segundo_nombres: z.string().nullish(),
  primer_apellido: z.string().nullish(),
  segundo_apellido: z.string().nullish(),
  razon_social: z.string().nullish(),
  nombre_comercial: z.string().nullish(),
  fechanacimiento: optionalDate,
  idtipodocumento: z.number().int().positive(),
  numerodocumento: z.string().min(1, "El número de documento es requerido"),
  fechavencimientodoc: optionalDate,
  idgenero: z.number().int().positive().optional(),
  idestadocivil: z.number().int().positive().optional(),
  idocupacion: z.number().int().positive().optional(),
  idtipopersona: z.number().int().positive(),
  idpais: z.number().int().positive(),
  iddepartamento: z.number().int().positive().optional(),
  direccion: z.string().nullish(),
  ciudad: z.string().nullish(),
  codigopostal: z.string().nullish(),
  telefono: z.string().nullish(),
  celular: z.string().nullish(),
  email: z
    .union([z.string().email("Email inválido"), z.literal(""), z.null()])
    .optional(),
  sitioweb: z
    .union([z.string().url("URL inválida"), z.literal(""), z.null()])
    .optional(),
  contacto_nombre: z.string().nullish(),
  contacto_cargo: z.string().nullish(),
  contacto_telefono: z.string().nullish(),
  contacto_email: z
    .union([
      z.string().email("Email de contacto inválido"),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  espep: z.boolean().nullish(),
  observaciones: z.string().nullish(),
  estado: z.boolean().nullish(),
});

export const UpdateClienteInputSchema = CreateClienteInputSchema.partial().extend(
  {
    idcliente: z.number().int().positive(),
  },
);

export const ClienteFiltersSchema = z.object({
  search: z.string().optional(),
  idtipodocumento: z.number().int().positive().optional(),
  idgenero: z.number().int().positive().optional(),
  idestadocivil: z.number().int().positive().optional(),
  idocupacion: z.number().int().positive().optional(),
  idtipopersona: z.number().int().positive().optional(),
  idpais: z.number().int().positive().optional(),
  iddepartamento: z.number().int().positive().optional(),
  estado: z.boolean().optional(),
});

// ============================================
// INPUT TYPES PARA GRAPHQL
// ============================================

export const CreateClienteInput = builder
  .inputRef("CreateClienteInput")
  .implement({
    fields: (t) => ({
      primer_nombres: t.string({ required: false }),
      segundo_nombres: t.string({ required: false }),
      primer_apellido: t.string({ required: false }),
      segundo_apellido: t.string({ required: false }),
      razon_social: t.string({ required: false }),
      nombre_comercial: t.string({ required: false }),
      fechanacimiento: t.field({ type: "DateTime", required: false }),
      idtipodocumento: t.int({ required: true }),
      numerodocumento: t.string({ required: true }),
      fechavencimientodoc: t.field({ type: "DateTime", required: false }),
      idgenero: t.int({ required: false }),
      idestadocivil: t.int({ required: false }),
      idocupacion: t.int({ required: false }),
      idtipopersona: t.int({ required: true }),
      idpais: t.int({ required: true }),
      iddepartamento: t.int({ required: false }),
      direccion: t.string({ required: false }),
      ciudad: t.string({ required: false }),
      codigopostal: t.string({ required: false }),
      telefono: t.string({ required: false }),
      celular: t.string({ required: false }),
      email: t.string({ required: false }),
      sitioweb: t.string({ required: false }),
      contacto_nombre: t.string({ required: false }),
      contacto_cargo: t.string({ required: false }),
      contacto_telefono: t.string({ required: false }),
      contacto_email: t.string({ required: false }),
      espep: t.boolean({ required: false, defaultValue: false }),
      observaciones: t.string({ required: false }),
      estado: t.boolean({ required: false, defaultValue: true }),
    }),
  });

export const UpdateClienteInput = builder
  .inputRef("UpdateClienteInput")
  .implement({
    fields: (t) => ({
      idcliente: t.int({ required: true }),
      primer_nombres: t.string({ required: false }),
      segundo_nombres: t.string({ required: false }),
      primer_apellido: t.string({ required: false }),
      segundo_apellido: t.string({ required: false }),
      razon_social: t.string({ required: false }),
      nombre_comercial: t.string({ required: false }),
      fechanacimiento: t.field({ type: "DateTime", required: false }),
      idtipodocumento: t.int({ required: false }),
      numerodocumento: t.string({ required: false }),
      fechavencimientodoc: t.field({ type: "DateTime", required: false }),
      idgenero: t.int({ required: false }),
      idestadocivil: t.int({ required: false }),
      idocupacion: t.int({ required: false }),
      idtipopersona: t.int({ required: false }),
      idpais: t.int({ required: false }),
      iddepartamento: t.int({ required: false }),
      direccion: t.string({ required: false }),
      ciudad: t.string({ required: false }),
      codigopostal: t.string({ required: false }),
      telefono: t.string({ required: false }),
      celular: t.string({ required: false }),
      email: t.string({ required: false }),
      sitioweb: t.string({ required: false }),
      contacto_nombre: t.string({ required: false }),
      contacto_cargo: t.string({ required: false }),
      contacto_telefono: t.string({ required: false }),
      contacto_email: t.string({ required: false }),
      espep: t.boolean({ required: false }),
      observaciones: t.string({ required: false }),
      estado: t.boolean({ required: false }),
    }),
  });

export const ClienteFiltersInput = builder
  .inputRef("ClienteFiltersInput")
  .implement({
    fields: (t) => ({
      search: t.string({ required: false }),
      idtipodocumento: t.int({ required: false }),
      idgenero: t.int({ required: false }),
      idestadocivil: t.int({ required: false }),
      idocupacion: t.int({ required: false }),
      idtipopersona: t.int({ required: false }),
      idpais: t.int({ required: false }),
      iddepartamento: t.int({ required: false }),
      estado: t.boolean({ required: false }),
    }),
  });

// ============================================
// TIPOS GRAPHQL
// ============================================

export const Cliente = definePrismaObject("tbl_cliente", {
  fields: (t) => ({
    idcliente: t.exposeInt("idcliente"),
    primer_nombres: t.exposeString("primer_nombres"),
    segundo_nombres: t.exposeString("segundo_nombres", { nullable: true }),
    primer_apellido: t.exposeString("primer_apellido", { nullable: true }),
    segundo_apellido: t.exposeString("segundo_apellido", { nullable: true }),
    razon_social: t.exposeString("razon_social", { nullable: true }),
    nombre_comercial: t.exposeString("nombre_comercial", { nullable: true }),
    fechanacimiento: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent: Record<string, unknown>) => parent.fechanacimiento,
    }),
    numerodocumento: t.exposeString("numerodocumento"),
    fechavencimientodoc: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent: Record<string, unknown>) => parent.fechavencimientodoc,
    }),
    direccion: t.exposeString("direccion", { nullable: true }),
    ciudad: t.exposeString("ciudad", { nullable: true }),
    codigopostal: t.exposeString("codigopostal", { nullable: true }),
    telefono: t.exposeString("telefono", { nullable: true }),
    celular: t.exposeString("celular", { nullable: true }),
    email: t.exposeString("email", { nullable: true }),
    sitioweb: t.exposeString("sitioweb", { nullable: true }),
    contacto_nombre: t.exposeString("contacto_nombre", { nullable: true }),
    contacto_cargo: t.exposeString("contacto_cargo", { nullable: true }),
    contacto_telefono: t.exposeString("contacto_telefono", {
      nullable: true,
    }),
    contacto_email: t.exposeString("contacto_email", { nullable: true }),
    espep: t.exposeBoolean("espep"),
    observaciones: t.exposeString("observaciones", { nullable: true }),
    estado: t.exposeBoolean("estado"),
    createdAt: t.field({
      type: "DateTime",
      resolve: (parent: Record<string, unknown>) => parent.createdAt,
    }),
    updatedAt: t.field({
      type: "DateTime",
      resolve: (parent: Record<string, unknown>) => parent.updatedAt,
    }),
    tipodocumento: t.relation("tipodocumento"),
    genero: t.relation("genero", { nullable: true }),
    estadocivil: t.relation("estadocivil", { nullable: true }),
    ocupacion: t.relation("ocupacion", { nullable: true }),
    tipopersona: t.relation("tipopersona"),
    pais: t.relation("pais"),
    departamento: t.relation("departamento", { nullable: true }),
  }),
});

export const ClientePage = builder.objectRef<{
  clientes: tbl_cliente[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("ClientePage");

ClientePage.implement({
  fields: (t) => ({
    clientes: t.field({
      type: [Cliente],
      resolve: (parent) => parent.clientes as never,
    }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});
