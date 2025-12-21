import { builder } from "../../builder";
import {
  TipoGestionEnum,
  TipoAcuerdoEnum,
  EstadoAcuerdoEnum,
} from "@prisma/client";
import { z } from "zod";

// ======================================================
// ENUMS GRAPHQL
// ======================================================
// Nota: GQLTipoCobro está definido en finanzas/types.ts para evitar duplicados

export const GQLTipoGestion = builder.enumType("TipoGestionEnum", {
  values: Object.values(TipoGestionEnum),
});

export const GQLTipoAcuerdo = builder.enumType("TipoAcuerdoEnum", {
  values: Object.values(TipoAcuerdoEnum),
});

export const GQLEstadoAcuerdo = builder.enumType("EstadoAcuerdoEnum", {
  values: Object.values(EstadoAcuerdoEnum),
});

// ======================================================
// SCHEMAS DE VALIDACIÓN ZOD
// ======================================================

const dateInput = z
  .union([z.date(), z.string()])
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    return typeof val === "string" ? new Date(val) : val;
  });

export const CreateAcuerdoInputSchema = z.object({
  idprestamo: z.number().int().positive(),
  idusuario: z.number().int().positive().optional(),
  tipoAcuerdo: z.nativeEnum(TipoAcuerdoEnum),
  montoAcordado: z.number().nonnegative(),
  numeroCuotas: z.number().int().positive().default(1),
  fechasPagoProgramadas: z.array(z.string()).optional(),
  fechaInicio: dateInput,
  fechaFin: dateInput.transform((d) => d ?? new Date()),
  observacion: z.string().optional(),
});

export const UpdateAcuerdoInputSchema = CreateAcuerdoInputSchema.partial().extend({
  idacuerdo: z.number().int().positive(),
  estado: z.nativeEnum(EstadoAcuerdoEnum).optional(),
});

export const AcuerdoFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  idprestamo: z.number().int().positive().optional(),
  idusuario: z.number().int().positive().optional(),
  tipoAcuerdo: z.nativeEnum(TipoAcuerdoEnum).optional(),
  estado: z.nativeEnum(EstadoAcuerdoEnum).optional(),
  fechaDesde: dateInput,
  fechaHasta: dateInput,
});

export const CreateGestionCobroInputSchema = z.object({
  idprestamo: z.number().int().positive(),
  idcuota: z.number().int().positive().optional(),
  idusuario: z.number().int().positive().optional(),
  idresultado: z.number().int().positive().optional(),
  tipoGestion: z.nativeEnum(TipoGestionEnum),
  canal: z.string(), // CanalCobranzaEnum como string
  fechaGestion: dateInput,
  proximaAccion: dateInput,
  duracionLlamada: z.number().int().nonnegative().optional(),
  resumen: z.string().optional(),
  notas: z.string().optional(),
  evidenciaArchivo: z.string().optional(),
});

export const UpdateGestionCobroInputSchema = CreateGestionCobroInputSchema.partial().extend({
  idgestion: z.number().int().positive(),
  estado: z.string().optional(), // EstadoGestionCobroEnum como string
});

export const GestionCobroFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  idprestamo: z.number().int().positive().optional(),
  idusuario: z.number().int().positive().optional(),
  tipoGestion: z.nativeEnum(TipoGestionEnum).optional(),
  estado: z.string().optional(),
  fechaDesde: dateInput,
  fechaHasta: dateInput,
});

export const CreateAsignacionCarteraInputSchema = z.object({
  idprestamo: z.number().int().positive(),
  idusuario: z.number().int().positive(),
  idusuarioAsignador: z.number().int().positive().optional(),
  motivo: z.string().optional(),
});

export const AsignacionCarteraFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  idprestamo: z.number().int().positive().optional(),
  idusuario: z.number().int().positive().optional(),
  activa: z.boolean().optional(),
});

// ======================================================
// INPUT TYPES GRAPHQL
// ======================================================

export const CreateAcuerdoInput = builder.inputRef("CreateAcuerdoInput").implement({
  fields: (t) => ({
    idprestamo: t.int({ required: true }),
    idusuario: t.int({ required: false }),
    tipoAcuerdo: t.field({ type: GQLTipoAcuerdo, required: true }),
    montoAcordado: t.float({ required: true }),
    numeroCuotas: t.int({ required: false, defaultValue: 1 }),
    fechasPagoProgramadas: t.stringList({ required: false }),
    fechaInicio: t.field({ type: "DateTime", required: false }),
    fechaFin: t.field({ type: "DateTime", required: true }),
    observacion: t.string({ required: false }),
  }),
});

export const UpdateAcuerdoInput = builder.inputRef("UpdateAcuerdoInput").implement({
  fields: (t) => ({
    idacuerdo: t.int({ required: true }),
    idprestamo: t.int({ required: false }),
    idusuario: t.int({ required: false }),
    tipoAcuerdo: t.field({ type: GQLTipoAcuerdo, required: false }),
    estado: t.field({ type: GQLEstadoAcuerdo, required: false }),
    montoAcordado: t.float({ required: false }),
    numeroCuotas: t.int({ required: false }),
    fechasPagoProgramadas: t.stringList({ required: false }),
    fechaInicio: t.field({ type: "DateTime", required: false }),
    fechaFin: t.field({ type: "DateTime", required: false }),
    observacion: t.string({ required: false }),
  }),
});

export const AcuerdoFiltersInput = builder.inputRef("AcuerdoFiltersInput").implement({
  fields: (t) => ({
    page: t.int({ required: false }),
    pageSize: t.int({ required: false }),
    idprestamo: t.int({ required: false }),
    idusuario: t.int({ required: false }),
    tipoAcuerdo: t.field({ type: GQLTipoAcuerdo, required: false }),
    estado: t.field({ type: GQLEstadoAcuerdo, required: false }),
    fechaDesde: t.field({ type: "DateTime", required: false }),
    fechaHasta: t.field({ type: "DateTime", required: false }),
  }),
});

export const CreateGestionCobroInput = builder.inputRef("CreateGestionCobroInput").implement({
  fields: (t) => ({
    idprestamo: t.int({ required: true }),
    idcuota: t.int({ required: false }),
    idusuario: t.int({ required: false }),
    idresultado: t.int({ required: false }),
    tipoGestion: t.field({ type: GQLTipoGestion, required: true }),
    canal: t.string({ required: true }),
    fechaGestion: t.field({ type: "DateTime", required: false }),
    proximaAccion: t.field({ type: "DateTime", required: false }),
    duracionLlamada: t.int({ required: false }),
    resumen: t.string({ required: false }),
    notas: t.string({ required: false }),
    evidenciaArchivo: t.string({ required: false }),
  }),
});

export const UpdateGestionCobroInput = builder.inputRef("UpdateGestionCobroInput").implement({
  fields: (t) => ({
    idgestion: t.int({ required: true }),
    idprestamo: t.int({ required: false }),
    idcuota: t.int({ required: false }),
    idusuario: t.int({ required: false }),
    idresultado: t.int({ required: false }),
    tipoGestion: t.field({ type: GQLTipoGestion, required: false }),
    canal: t.string({ required: false }),
    estado: t.string({ required: false }),
    fechaGestion: t.field({ type: "DateTime", required: false }),
    proximaAccion: t.field({ type: "DateTime", required: false }),
    duracionLlamada: t.int({ required: false }),
    resumen: t.string({ required: false }),
    notas: t.string({ required: false }),
    evidenciaArchivo: t.string({ required: false }),
  }),
});

export const GestionCobroFiltersInput = builder.inputRef("GestionCobroFiltersInput").implement({
  fields: (t) => ({
    page: t.int({ required: false }),
    pageSize: t.int({ required: false }),
    idprestamo: t.int({ required: false }),
    idusuario: t.int({ required: false }),
    tipoGestion: t.field({ type: GQLTipoGestion, required: false }),
    estado: t.string({ required: false }),
    fechaDesde: t.field({ type: "DateTime", required: false }),
    fechaHasta: t.field({ type: "DateTime", required: false }),
  }),
});

export const CreateAsignacionCarteraInput = builder.inputRef("CreateAsignacionCarteraInput").implement({
  fields: (t) => ({
    idprestamo: t.int({ required: true }),
    idusuario: t.int({ required: true }),
    idusuarioAsignador: t.int({ required: false }),
    motivo: t.string({ required: false }),
  }),
});

export const AsignacionCarteraFiltersInput = builder.inputRef("AsignacionCarteraFiltersInput").implement({
  fields: (t) => ({
    page: t.int({ required: false }),
    pageSize: t.int({ required: false }),
    idprestamo: t.int({ required: false }),
    idusuario: t.int({ required: false }),
    activa: t.boolean({ required: false }),
  }),
});

// ======================================================
// TIPOS GRAPHQL
// ======================================================

const decimalToNumber = (val: any): number => (val === null || val === undefined ? 0 : Number(val));
const decimalToNullableNumber = (val: any): number | null =>
  val === null || val === undefined ? null : Number(val);

export const ResultadoGestion = builder.prismaObject("tbl_resultado_gestion" as any, {
  fields: (t) => ({
    idresultado: t.exposeInt("idresultado"),
    codigo: t.exposeString("codigo"),
    descripcion: t.exposeString("descripcion"),
    estado: t.exposeBoolean("estado"),
    deletedAt: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent) => parent.deletedAt,
    }),
    createdAt: t.field({
      type: "DateTime",
      resolve: (parent) => parent.createdAt,
    }),
    updatedAt: t.field({
      type: "DateTime",
      resolve: (parent) => parent.updatedAt,
    }),
  }),
});

export const Acuerdo = builder.prismaObject("tbl_acuerdo" as any, {
  fields: (t) => ({
    idacuerdo: t.exposeInt("idacuerdo"),
    idprestamo: t.exposeInt("idprestamo"),
    idusuario: t.exposeInt("idusuario", { nullable: true }),
    tipoAcuerdo: t.expose("tipoAcuerdo", { type: GQLTipoAcuerdo }),
    estado: t.expose("estado", { type: GQLEstadoAcuerdo }),
    montoAcordado: t.float({
      resolve: (parent) => decimalToNumber(parent.montoAcordado),
    }),
    numeroCuotas: t.exposeInt("numeroCuotas"),
    fechasPagoProgramadas: t.exposeString("fechasPagoProgramadas", { nullable: true }),
    fechaInicio: t.field({
      type: "DateTime",
      resolve: (parent) => parent.fechaInicio,
    }),
    fechaFin: t.field({
      type: "DateTime",
      resolve: (parent) => parent.fechaFin,
    }),
    observacion: t.exposeString("observacion", { nullable: true }),
    deletedAt: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent) => parent.deletedAt,
    }),
    createdAt: t.field({
      type: "DateTime",
      resolve: (parent) => parent.createdAt,
    }),
    updatedAt: t.field({
      type: "DateTime",
      resolve: (parent) => parent.updatedAt,
    }),
    prestamo: t.relation("prestamo"),
    usuario: t.relation("usuario", { nullable: true }),
    pagos: t.relation("pagos"),
  }),
});

export const GestionCobro = builder.prismaObject("tbl_gestion_cobro" as any, {
  fields: (t) => ({
    idgestion: t.exposeInt("idgestion"),
    idprestamo: t.exposeInt("idprestamo"),
    idcuota: t.exposeInt("idcuota", { nullable: true }),
    idusuario: t.exposeInt("idusuario", { nullable: true }),
    idresultado: t.exposeInt("idresultado", { nullable: true }),
    tipoGestion: t.expose("tipoGestion", { type: GQLTipoGestion }),
    canal: t.exposeString("canal"),
    estado: t.exposeString("estado"),
    fechaGestion: t.field({
      type: "DateTime",
      resolve: (parent) => parent.fechaGestion,
    }),
    proximaAccion: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent) => parent.proximaAccion,
    }),
    duracionLlamada: t.exposeInt("duracionLlamada", { nullable: true }),
    resumen: t.exposeString("resumen", { nullable: true }),
    notas: t.exposeString("notas", { nullable: true }),
    evidenciaArchivo: t.exposeString("evidenciaArchivo", { nullable: true }),
    createdAt: t.field({
      type: "DateTime",
      resolve: (parent) => parent.createdAt,
    }),
    updatedAt: t.field({
      type: "DateTime",
      resolve: (parent) => parent.updatedAt,
    }),
    prestamo: t.relation("prestamo"),
    cuota: t.relation("cuota", { nullable: true }),
    usuario: t.relation("usuario", { nullable: true }),
    resultado: t.relation("resultado", { nullable: true }),
  }),
});

export const AsignacionCartera = builder.prismaObject("tbl_asignacion_cartera" as any, {
  fields: (t) => ({
    idasignacion: t.exposeInt("idasignacion"),
    idprestamo: t.exposeInt("idprestamo"),
    idusuario: t.exposeInt("idusuario"),
    idusuarioAsignador: t.exposeInt("idusuarioAsignador", { nullable: true }),
    fechaAsignacion: t.field({
      type: "DateTime",
      resolve: (parent) => parent.fechaAsignacion,
    }),
    fechaFin: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent) => parent.fechaFin,
    }),
    motivo: t.exposeString("motivo", { nullable: true }),
    activa: t.exposeBoolean("activa"),
    deletedAt: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent) => parent.deletedAt,
    }),
    createdAt: t.field({
      type: "DateTime",
      resolve: (parent) => parent.createdAt,
    }),
    updatedAt: t.field({
      type: "DateTime",
      resolve: (parent) => parent.updatedAt,
    }),
    prestamo: t.relation("prestamo"),
    usuario: t.relation("usuario"),
  }),
});

// ======================================================
// PAGINACIÓN
// ======================================================

export const AcuerdoPage = builder.objectRef<{
  acuerdos: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("AcuerdoPage");

AcuerdoPage.implement({
  fields: (t) => ({
    acuerdos: t.field({
      type: [Acuerdo],
      resolve: (parent) => parent.acuerdos,
    }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});

export const GestionCobroPage = builder.objectRef<{
  gestiones: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("GestionCobroPage");

GestionCobroPage.implement({
  fields: (t) => ({
    gestiones: t.field({
      type: [GestionCobro],
      resolve: (parent) => parent.gestiones,
    }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});

export const AsignacionCarteraPage = builder.objectRef<{
  asignaciones: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("AsignacionCarteraPage");

AsignacionCarteraPage.implement({
  fields: (t) => ({
    asignaciones: t.field({
      type: [AsignacionCartera],
      resolve: (parent) => parent.asignaciones,
    }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});


