import { builder } from "../../builder";
import { z } from "zod";

// ============================================
// SCHEMAS DE VALIDACIÓN ZOD
// ============================================

export const CreateClienteInputSchema = z.object({
  primer_nombres: z.string().min(1, "El primer nombre es requerido"),
  segundo_nombres: z.string().optional(),
  primer_apellido: z.string().min(1, "El primer apellido es requerido"),
  segundo_apellido: z.string().optional(),
  fechanacimiento: z.union([z.date(), z.string()]).optional().transform((val) => {
    if (!val) return undefined;
    return typeof val === 'string' ? new Date(val) : val;
  }),
  idtipodocumento: z.number().int().positive(),
  numerodocumento: z.string().min(1, "El número de documento es requerido"),
  fechavencimientodoc: z.union([z.date(), z.string()]).optional().transform((val) => {
    if (!val) return undefined;
    return typeof val === 'string' ? new Date(val) : val;
  }),
  idgenero: z.number().int().positive().optional(),
  idestadocivil: z.number().int().positive().optional(),
  idocupacion: z.number().int().positive().optional(),
  idtipopersona: z.number().int().positive(),
  idpais: z.number().int().positive(),
  iddepartamento: z.number().int().positive().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  codigopostal: z.string().optional(),
  telefono: z.string().optional(),
  celular: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  sitioweb: z.string().url("URL inválida").optional().or(z.literal("")),
  espep: z.boolean().default(false),
  observaciones: z.string().optional(),
  estado: z.boolean().default(true),
});

export const UpdateClienteInputSchema = CreateClienteInputSchema.partial().extend({
  idcliente: z.number().int().positive(),
});

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

export const CreateClienteInput = builder.inputRef("CreateClienteInput").implement({
  fields: (t) => ({
    primer_nombres: t.string({ required: true }),
    segundo_nombres: t.string({ required: false }),
    primer_apellido: t.string({ required: true }),
    segundo_apellido: t.string({ required: false }),
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
    espep: t.boolean({ required: false, defaultValue: false }),
    observaciones: t.string({ required: false }),
    estado: t.boolean({ required: false, defaultValue: true }),
  }),
});

export const UpdateClienteInput = builder.inputRef("UpdateClienteInput").implement({
  fields: (t) => ({
    idcliente: t.int({ required: true }),
    primer_nombres: t.string({ required: false }),
    segundo_nombres: t.string({ required: false }),
    primer_apellido: t.string({ required: false }),
    segundo_apellido: t.string({ required: false }),
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
    espep: t.boolean({ required: false }),
    observaciones: t.string({ required: false }),
    estado: t.boolean({ required: false }),
  }),
});

export const ClienteFiltersInput = builder.inputRef("ClienteFiltersInput").implement({
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

export const Cliente = builder.prismaObject("tbl_cliente", {
  fields: (t: any) => ({
    idcliente: t.exposeInt("idcliente"),
    primer_nombres: t.exposeString("primer_nombres"),
    segundo_nombres: t.exposeString("segundo_nombres", { nullable: true }),
    primer_apellido: t.exposeString("primer_apellido"),
    segundo_apellido: t.exposeString("segundo_apellido", { nullable: true }),
    fechanacimiento: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent: any) => parent.fechanacimiento,
    }),
    numerodocumento: t.exposeString("numerodocumento"),
    fechavencimientodoc: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent: any) => parent.fechavencimientodoc,
    }),
    direccion: t.exposeString("direccion", { nullable: true }),
    ciudad: t.exposeString("ciudad", { nullable: true }),
    codigopostal: t.exposeString("codigopostal", { nullable: true }),
    telefono: t.exposeString("telefono", { nullable: true }),
    celular: t.exposeString("celular", { nullable: true }),
    email: t.exposeString("email", { nullable: true }),
    sitioweb: t.exposeString("sitioweb", { nullable: true }),
    espep: t.exposeBoolean("espep"),
    observaciones: t.exposeString("observaciones", { nullable: true }),
    estado: t.exposeBoolean("estado"),
    createdAt: t.field({
      type: "DateTime",
      resolve: (parent: any) => parent.createdAt,
    }),
    updatedAt: t.field({
      type: "DateTime",
      resolve: (parent: any) => parent.updatedAt,
    }),
    // Relaciones
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
  clientes: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("ClientePage");

ClientePage.implement({
  fields: (t: any) => ({
    clientes: t.field({
      type: [Cliente],
      resolve: (parent: any) => parent.clientes,
    }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});

