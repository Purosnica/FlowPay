import { builder } from "../../builder";
import {
  EstadoCuotaEnum,
  EstadoPrestamoEnum,
  EstadoLiquidacionEnum,
  MetodoPagoEnum,
  TipoPrestamoEnum,
  TipoDocumentoEnum,
  TipoCobroEnum,
} from "@prisma/client";
import { z } from "zod";

// ======================================================
// ENUMS GRAPHQL (mapean enums de Prisma)
// ======================================================

export const GQLEstadoPrestamo = builder.enumType("EstadoPrestamoEnum", {
  values: Object.values(EstadoPrestamoEnum),
});

export const GQLTipoPrestamo = builder.enumType("TipoPrestamoEnum", {
  values: Object.values(TipoPrestamoEnum),
});

export const GQLEstadoCuota = builder.enumType("EstadoCuotaEnum", {
  values: Object.values(EstadoCuotaEnum),
});

export const GQLMetodoPago = builder.enumType("MetodoPagoEnum", {
  values: Object.values(MetodoPagoEnum),
});

export const GQLTipoCobro = builder.enumType("TipoCobroEnum", {
  values: Object.values(TipoCobroEnum),
});

export const GQLEstadoLiquidacion = builder.enumType("EstadoLiquidacionEnum", {
  values: Object.values(EstadoLiquidacionEnum),
});

export const GQLTipoDocumento = builder.enumType("TipoDocumentoEnum", {
  values: Object.values(TipoDocumentoEnum),
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

export const PrestamoFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  idcliente: z.number().int().positive().optional(),
  estado: z.nativeEnum(EstadoPrestamoEnum).optional(),
  tipoprestamo: z.nativeEnum(TipoPrestamoEnum).optional(),
  search: z.string().optional(),
});

export const CreatePrestamoInputSchema = z.object({
  idcliente: z.number().int().positive(),
  idusuarioCreador: z.number().int().positive().optional(),
  codigo: z.string().min(1),
  referencia: z.string().optional(),
  tipoprestamo: z.nativeEnum(TipoPrestamoEnum),
  estado: z.nativeEnum(EstadoPrestamoEnum).optional(),
  montoSolicitado: z.number().nonnegative(),
  montoAprobado: z.number().nonnegative().optional(),
  montoDesembolsado: z.number().nonnegative().optional(),
  comisionTercerizado: z.number().nonnegative().optional(),
  tasaInteresAnual: z.number().nonnegative().optional(),
  plazoMeses: z.number().int().positive().optional(),
  fechaSolicitud: dateInput,
  fechaAprobacion: dateInput,
  fechaDesembolso: dateInput,
  fechaVencimiento: dateInput,
  observaciones: z.string().optional(),
});

export const UpdatePrestamoInputSchema = CreatePrestamoInputSchema.partial().extend({
  idprestamo: z.number().int().positive(),
  idusuarioMod: z.number().int().positive().optional(),
});

export const CreateCuotaInputSchema = z.object({
  idprestamo: z.number().int().positive(),
  numero: z.number().int().positive(),
  estado: z.nativeEnum(EstadoCuotaEnum).optional(),
  fechaVencimiento: dateInput.transform((d) => d ?? new Date()),
  fechaPago: dateInput,
  capitalProgramado: z.number().nonnegative(),
  interesProgramado: z.number().nonnegative(),
  moraProgramada: z.number().nonnegative().optional(),
  capitalPagado: z.number().nonnegative().optional(),
  interesPagado: z.number().nonnegative().optional(),
  moraPagada: z.number().nonnegative().optional(),
  saldoCapital: z.number().nonnegative().optional(),
  diasMoraAcumulados: z.number().int().nonnegative().optional(),
});

export const UpdateCuotaInputSchema = CreateCuotaInputSchema.partial().extend({
  idcuota: z.number().int().positive(),
});

export const CreatePagoInputSchema = z.object({
  idprestamo: z.number().int().positive(),
  idcuota: z.number().int().positive().optional(),
  idacuerdo: z.number().int().positive().optional(),
  idusuario: z.number().int().positive().optional(),
  metodoPago: z.nativeEnum(MetodoPagoEnum),
  tipoCobro: z.nativeEnum(TipoCobroEnum).optional(),
  fechaPago: dateInput,
  referencia: z.string().optional(),
  montoCapital: z.number().nonnegative().default(0),
  montoInteres: z.number().nonnegative().default(0),
  montoMora: z.number().nonnegative().default(0),
  montoTotal: z.number().nonnegative().optional(),
  observacion: z.string().optional(),
  notas: z.string().optional(),
});

export const UpdatePagoInputSchema = CreatePagoInputSchema.partial().extend({
  idpago: z.number().int().positive(),
});

// ======================================================
// INPUT TYPES GRAPHQL
// ======================================================

export const PrestamoFiltersInput = builder.inputRef("PrestamoFiltersInput").implement({
  fields: (t) => ({
    page: t.int({ required: false }),
    pageSize: t.int({ required: false }),
    idcliente: t.int({ required: false }),
    estado: t.field({ type: GQLEstadoPrestamo, required: false }),
    tipoprestamo: t.field({ type: GQLTipoPrestamo, required: false }),
    search: t.string({ required: false }),
  }),
});

export const CreatePrestamoInput = builder.inputRef("CreatePrestamoInput").implement({
  fields: (t) => ({
    idcliente: t.int({ required: true }),
    idusuarioCreador: t.int({ required: false }),
    codigo: t.string({ required: true }),
    referencia: t.string({ required: false }),
    tipoprestamo: t.field({ type: GQLTipoPrestamo, required: true }),
    estado: t.field({ type: GQLEstadoPrestamo, required: false }),
    montoSolicitado: t.float({ required: true }),
    montoAprobado: t.float({ required: false }),
    montoDesembolsado: t.float({ required: false }),
    comisionTercerizado: t.float({ required: false }),
    tasaInteresAnual: t.float({ required: false }),
    plazoMeses: t.int({ required: false }),
    fechaSolicitud: t.field({ type: "DateTime", required: false }),
    fechaAprobacion: t.field({ type: "DateTime", required: false }),
    fechaDesembolso: t.field({ type: "DateTime", required: false }),
    fechaVencimiento: t.field({ type: "DateTime", required: false }),
    observaciones: t.string({ required: false }),
  }),
});

export const UpdatePrestamoInput = builder.inputRef("UpdatePrestamoInput").implement({
  fields: (t) => ({
    idprestamo: t.int({ required: true }),
    idcliente: t.int({ required: false }),
    idusuarioCreador: t.int({ required: false }),
    idusuarioMod: t.int({ required: false }),
    codigo: t.string({ required: false }),
    referencia: t.string({ required: false }),
    tipoprestamo: t.field({ type: GQLTipoPrestamo, required: false }),
    estado: t.field({ type: GQLEstadoPrestamo, required: false }),
    montoSolicitado: t.float({ required: false }),
    montoAprobado: t.float({ required: false }),
    montoDesembolsado: t.float({ required: false }),
    comisionTercerizado: t.float({ required: false }),
    tasaInteresAnual: t.float({ required: false }),
    plazoMeses: t.int({ required: false }),
    fechaSolicitud: t.field({ type: "DateTime", required: false }),
    fechaAprobacion: t.field({ type: "DateTime", required: false }),
    fechaDesembolso: t.field({ type: "DateTime", required: false }),
    fechaVencimiento: t.field({ type: "DateTime", required: false }),
    observaciones: t.string({ required: false }),
  }),
});

export const CreateCuotaInput = builder.inputRef("CreateCuotaInput").implement({
  fields: (t) => ({
    idprestamo: t.int({ required: true }),
    numero: t.int({ required: true }),
    estado: t.field({ type: GQLEstadoCuota, required: false }),
    fechaVencimiento: t.field({ type: "DateTime", required: true }),
    fechaPago: t.field({ type: "DateTime", required: false }),
    capitalProgramado: t.float({ required: true }),
    interesProgramado: t.float({ required: true }),
    moraProgramada: t.float({ required: false }),
    capitalPagado: t.float({ required: false }),
    interesPagado: t.float({ required: false }),
    moraPagada: t.float({ required: false }),
    saldoCapital: t.float({ required: false }),
    diasMoraAcumulados: t.int({ required: false }),
  }),
});

export const UpdateCuotaInput = builder.inputRef("UpdateCuotaInput").implement({
  fields: (t) => ({
    idcuota: t.int({ required: true }),
    idprestamo: t.int({ required: false }),
    numero: t.int({ required: false }),
    estado: t.field({ type: GQLEstadoCuota, required: false }),
    fechaVencimiento: t.field({ type: "DateTime", required: false }),
    fechaPago: t.field({ type: "DateTime", required: false }),
    capitalProgramado: t.float({ required: false }),
    interesProgramado: t.float({ required: false }),
    moraProgramada: t.float({ required: false }),
    capitalPagado: t.float({ required: false }),
    interesPagado: t.float({ required: false }),
    moraPagada: t.float({ required: false }),
    saldoCapital: t.float({ required: false }),
    diasMoraAcumulados: t.int({ required: false }),
  }),
});

export const CreatePagoInput = builder.inputRef("CreatePagoInput").implement({
  fields: (t) => ({
    idprestamo: t.int({ required: true }),
    idcuota: t.int({ required: false }),
    idacuerdo: t.int({ required: false }),
    idusuario: t.int({ required: false }),
    metodoPago: t.field({ type: GQLMetodoPago, required: true }),
    tipoCobro: t.field({ type: GQLTipoCobro, required: false }),
    fechaPago: t.field({ type: "DateTime", required: false }),
    referencia: t.string({ required: false }),
    montoCapital: t.float({ required: false, defaultValue: 0 }),
    montoInteres: t.float({ required: false, defaultValue: 0 }),
    montoMora: t.float({ required: false, defaultValue: 0 }),
    montoTotal: t.float({ required: false }),
    observacion: t.string({ required: false }),
    notas: t.string({ required: false }),
  }),
});

export const UpdatePagoInput = builder.inputRef("UpdatePagoInput").implement({
  fields: (t) => ({
    idpago: t.int({ required: true }),
    idprestamo: t.int({ required: false }),
    idcuota: t.int({ required: false }),
    idacuerdo: t.int({ required: false }),
    idusuario: t.int({ required: false }),
    metodoPago: t.field({ type: GQLMetodoPago, required: false }),
    tipoCobro: t.field({ type: GQLTipoCobro, required: false }),
    fechaPago: t.field({ type: "DateTime", required: false }),
    referencia: t.string({ required: false }),
    montoCapital: t.float({ required: false }),
    montoInteres: t.float({ required: false }),
    montoMora: t.float({ required: false }),
    montoTotal: t.float({ required: false }),
    observacion: t.string({ required: false }),
    notas: t.string({ required: false }),
  }),
});

// ======================================================
// TIPOS GRAPHQL
// ======================================================

const decimalToNumber = (val: any): number => (val === null || val === undefined ? 0 : Number(val));
const decimalToNullableNumber = (val: any): number | null =>
  val === null || val === undefined ? null : Number(val);

// Tipo básico de Usuario (sin relaciones complejas para evitar dependencias circulares)
export const Usuario = builder.prismaObject("tbl_usuario" as any, {
  fields: (t) => ({
    idusuario: t.exposeInt("idusuario"),
    idrol: t.exposeInt("idrol"),
    nombre: t.exposeString("nombre"),
    email: t.exposeString("email"),
    telefono: t.exposeString("telefono", { nullable: true }),
    activo: t.exposeBoolean("activo"),
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

export const Pago = builder.prismaObject("tbl_pago" as any, {
  fields: (t) => ({
    idpago: t.exposeInt("idpago"),
    idprestamo: t.exposeInt("idprestamo"),
    idcuota: t.exposeInt("idcuota", { nullable: true }),
    idacuerdo: t.exposeInt("idacuerdo", { nullable: true }),
    idusuario: t.exposeInt("idusuario", { nullable: true }),
    metodoPago: t.expose("metodoPago", { type: GQLMetodoPago }),
    tipoCobro: t.expose("tipoCobro", { type: GQLTipoCobro }),
    fechaPago: t.field({
      type: "DateTime",
      resolve: (parent) => parent.fechaPago,
    }),
    referencia: t.exposeString("referencia", { nullable: true }),
    montoCapital: t.float({
      resolve: (parent) => decimalToNumber(parent.montoCapital),
    }),
    montoInteres: t.float({
      resolve: (parent) => decimalToNumber(parent.montoInteres),
    }),
    montoMora: t.float({
      resolve: (parent) => decimalToNumber(parent.montoMora),
    }),
    montoTotal: t.float({
      resolve: (parent) => decimalToNumber(parent.montoTotal),
    }),
    observacion: t.exposeString("observacion", { nullable: true }),
    notas: t.exposeString("notas", { nullable: true }),
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
    cuota: t.relation("cuota", { nullable: true }),
    acuerdo: t.relation("acuerdo", { nullable: true }),
    usuario: t.relation("usuario", { nullable: true }),
  }),
});

export const Cuota = builder.prismaObject("tbl_cuota" as any, {
  fields: (t) => ({
    idcuota: t.exposeInt("idcuota"),
    idprestamo: t.exposeInt("idprestamo"),
    numero: t.exposeInt("numero"),
    estado: t.expose("estado", { type: GQLEstadoCuota }),
    fechaVencimiento: t.field({
      type: "DateTime",
      resolve: (parent) => parent.fechaVencimiento,
    }),
    fechaPago: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent) => parent.fechaPago,
    }),
    capitalProgramado: t.float({
      resolve: (parent) => decimalToNumber(parent.capitalProgramado),
    }),
    interesProgramado: t.float({
      resolve: (parent) => decimalToNumber(parent.interesProgramado),
    }),
    moraProgramada: t.float({
      resolve: (parent) => decimalToNumber(parent.moraProgramada),
    }),
    capitalPagado: t.float({
      resolve: (parent) => decimalToNumber(parent.capitalPagado),
    }),
    interesPagado: t.float({
      resolve: (parent) => decimalToNumber(parent.interesPagado),
    }),
    moraPagada: t.float({
      resolve: (parent) => decimalToNumber(parent.moraPagada),
    }),
    saldoCapital: t.float({
      nullable: true,
      resolve: (parent) => decimalToNullableNumber(parent.saldoCapital),
    }),
    diasMoraAcumulados: t.exposeInt("diasMoraAcumulados"),
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
    pagos: t.field({
      type: [Pago],
      resolve: (parent, _args, ctx) =>
        ctx.prisma.tbl_pago.findMany({
          where: { idcuota: parent.idcuota, deletedAt: null },
          orderBy: { fechaPago: "desc" },
        }),
    }),
  }),
});

export const Prestamo = builder.prismaObject("tbl_prestamo" as any, {
  fields: (t) => ({
    idprestamo: t.exposeInt("idprestamo"),
    idcliente: t.exposeInt("idcliente"),
    idusuarioCreador: t.exposeInt("idusuarioCreador", { nullable: true }),
    idusuarioMod: t.exposeInt("idusuarioMod", { nullable: true }),
    idusuarioGestor: t.exposeInt("idusuarioGestor", { nullable: true }),
    tipoprestamo: t.field({
      type: GQLTipoPrestamo,
      resolve: (parent) => parent.tipoprestamo,
    }),
    estado: t.field({
      type: GQLEstadoPrestamo,
      resolve: (parent) => parent.estado,
    }),
    codigo: t.exposeString("codigo"),
    referencia: t.exposeString("referencia", { nullable: true }),
    montoSolicitado: t.float({
      resolve: (parent) => decimalToNumber(parent.montoSolicitado),
    }),
    montoAprobado: t.float({
      nullable: true,
      resolve: (parent) => decimalToNullableNumber(parent.montoAprobado),
    }),
    montoDesembolsado: t.float({
      nullable: true,
      resolve: (parent) => decimalToNullableNumber(parent.montoDesembolsado),
    }),
    comisionTercerizado: t.float({
      nullable: true,
      resolve: (parent) => decimalToNullableNumber(parent.comisionTercerizado),
    }),
    tasaInteresAnual: t.float({
      nullable: true,
      resolve: (parent) => decimalToNullableNumber(parent.tasaInteresAnual),
    }),
    plazoMeses: t.exposeInt("plazoMeses", { nullable: true }),
    fechaSolicitud: t.field({
      type: "DateTime",
      resolve: (parent) => parent.fechaSolicitud,
    }),
    fechaAprobacion: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent) => parent.fechaAprobacion,
    }),
    fechaDesembolso: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent) => parent.fechaDesembolso,
    }),
    fechaVencimiento: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent) => parent.fechaVencimiento,
    }),
    observaciones: t.exposeString("observaciones", { nullable: true }),
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
    cliente: t.relation("cliente"),
    usuarioCreador: t.relation("usuarioCreador", { nullable: true }),
    usuarioMod: t.relation("usuarioMod", { nullable: true }),
    usuarioGestor: t.relation("usuarioGestor", { nullable: true }),
    cuotas: t.field({
      type: [Cuota],
      resolve: (parent, _args, ctx) =>
        ctx.prisma.tbl_cuota.findMany({
          where: { idprestamo: parent.idprestamo, deletedAt: null },
          orderBy: { numero: "asc" },
        }),
    }),
    pagos: t.field({
      type: [Pago],
      resolve: (parent, _args, ctx) =>
        ctx.prisma.tbl_pago.findMany({
          where: { idprestamo: parent.idprestamo, deletedAt: null },
          orderBy: { fechaPago: "desc" },
        }),
    }),
    castigos: t.field({
      type: [Castigo],
      resolve: (parent, _args, ctx) =>
        ctx.prisma.tbl_castigo.findMany({
          where: { idprestamo: parent.idprestamo, deletedAt: null },
          orderBy: { fechaCastigo: "desc" },
        }),
    }),
  }),
});

// ======================================================
// PAGINACIÓN / RESPUESTAS
// ======================================================

export const PrestamoPage = builder.objectRef<{
  prestamos: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("PrestamoPage");

PrestamoPage.implement({
  fields: (t) => ({
    prestamos: t.field({
      type: [Prestamo],
      resolve: (parent) => parent.prestamos,
    }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});

export const CuotaPage = builder.objectRef<{
  cuotas: any[];
  total: number;
}>("CuotaPage");

CuotaPage.implement({
  fields: (t) => ({
    cuotas: t.field({
      type: [Cuota],
      resolve: (parent) => parent.cuotas,
    }),
    total: t.exposeInt("total"),
  }),
});

export const PagoPage = builder.objectRef<{
  pagos: any[];
  total: number;
}>("PagoPage");

PagoPage.implement({
  fields: (t) => ({
    pagos: t.field({
      type: [Pago],
      resolve: (parent) => parent.pagos,
    }),
    total: t.exposeInt("total"),
  }),
});

// ======================================================
// TIPOS Y FILTROS PARA REESTRUCTURACIÓN
// ======================================================

export const Reestructuracion = builder.prismaObject("tbl_reestructuracion" as any, {
  fields: (t) => ({
    idreestructuracion: t.exposeInt("idreestructuracion"),
    idprestamoOriginal: t.exposeInt("idprestamoOriginal"),
    idprestamoNuevo: t.exposeInt("idprestamoNuevo"),
    idusuarioSolicitante: t.exposeInt("idusuarioSolicitante", { nullable: true }),
    idusuarioAutorizador: t.exposeInt("idusuarioAutorizador", { nullable: true }),
    motivo: t.exposeString("motivo"),
    observaciones: t.exposeString("observaciones", { nullable: true }),
    evidencia: t.exposeString("evidencia", { nullable: true }), // Ruta o referencia a documento de evidencia
    fechaReestructuracion: t.field({
      type: "DateTime",
      resolve: (parent) => parent.fechaReestructuracion,
    }),
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
    prestamoOriginal: t.relation("prestamoOriginal"),
    prestamoNuevo: t.relation("prestamoNuevo"),
    usuarioSolicitante: t.relation("usuarioSolicitante", { nullable: true }),
    usuarioAutorizador: t.relation("usuarioAutorizador", { nullable: true }),
  }),
});

export const CreateReestructuracionInputSchema = z.object({
  idprestamoOriginal: z.number().int().positive(),
  idusuarioSolicitante: z.number().int().positive().optional(),
  idusuarioAutorizador: z.number().int().positive().optional(),
  motivo: z.string().min(1),
  observaciones: z.string().optional(),
  evidencia: z.string().optional(), // Ruta o referencia a documento de evidencia
  diaPago: z.number().int().min(1).max(31).optional(), // Día del mes para pagos
  // Datos del nuevo préstamo
  nuevoPrestamo: z.object({
    codigo: z.string().min(1),
    referencia: z.string().optional(),
    tipoprestamo: z.nativeEnum(TipoPrestamoEnum),
    montoSolicitado: z.number().nonnegative(),
    montoAprobado: z.number().nonnegative().optional(),
    montoDesembolsado: z.number().nonnegative().optional(),
    tasaInteresAnual: z.number().nonnegative().optional(),
    plazoMeses: z.number().int().positive().optional(),
    fechaSolicitud: dateInput,
    fechaAprobacion: dateInput,
    fechaDesembolso: dateInput,
    fechaVencimiento: dateInput,
    observaciones: z.string().optional(),
  }),
});

// Input type para el nuevo préstamo en la reestructuración
export const NuevoPrestamoReestructuracionInput = builder.inputRef("NuevoPrestamoReestructuracionInput").implement({
  fields: (t) => ({
    codigo: t.string({ required: true }),
    referencia: t.string({ required: false }),
    tipoprestamo: t.field({ type: GQLTipoPrestamo, required: true }),
    montoSolicitado: t.float({ required: true }),
    montoAprobado: t.float({ required: false }),
    montoDesembolsado: t.float({ required: false }),
    tasaInteresAnual: t.float({ required: false }),
    plazoMeses: t.int({ required: false }),
    fechaSolicitud: t.field({ type: "DateTime", required: false }),
    fechaAprobacion: t.field({ type: "DateTime", required: false }),
    fechaDesembolso: t.field({ type: "DateTime", required: false }),
    fechaVencimiento: t.field({ type: "DateTime", required: false }),
    observaciones: t.string({ required: false }),
  }),
});

export const CreateReestructuracionInput = builder.inputRef("CreateReestructuracionInput").implement({
  fields: (t) => ({
    idprestamoOriginal: t.int({ required: true }),
    idusuarioSolicitante: t.int({ required: false }),
    idusuarioAutorizador: t.int({ required: false }),
    motivo: t.string({ required: true }),
    observaciones: t.string({ required: false }),
    evidencia: t.string({ required: false }), // Ruta o referencia a documento de evidencia
    diaPago: t.int({ required: false }), // Día del mes para pagos (1-31)
    nuevoPrestamo: t.field({
      type: NuevoPrestamoReestructuracionInput,
      required: true,
    }),
  }),
});

export const ReestructuracionFiltersInput = builder.inputRef("ReestructuracionFiltersInput").implement({
  fields: (t) => ({
    page: t.int({ required: false }),
    pageSize: t.int({ required: false }),
    idprestamoOriginal: t.int({ required: false }),
    idprestamoNuevo: t.int({ required: false }),
    idusuarioSolicitante: t.int({ required: false }),
    idusuarioAutorizador: t.int({ required: false }),
    fechaDesde: t.field({ type: "DateTime", required: false }),
    fechaHasta: t.field({ type: "DateTime", required: false }),
  }),
});

export const ReestructuracionPage = builder.objectRef<{
  reestructuraciones: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("ReestructuracionPage");

ReestructuracionPage.implement({
  fields: (t) => ({
    reestructuraciones: t.field({
      type: [Reestructuracion],
      resolve: (parent) => parent.reestructuraciones,
    }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});

// ======================================================
// TIPOS Y FILTROS PARA CARTERA
// ======================================================

export const CarteraFiltersInput = builder.inputRef("CarteraFiltersInput").implement({
  fields: (t) => ({
    page: t.int({ required: false }),
    pageSize: t.int({ required: false }),
    tipo: t.string({ required: false }), // "activa", "mora", "castigada"
    tipoprestamo: t.field({ type: GQLTipoPrestamo, required: false }),
    idusuarioGestor: t.int({ required: false }),
    diasAtrasoMin: t.int({ required: false }),
    diasAtrasoMax: t.int({ required: false }),
    montoMin: t.float({ required: false }),
    montoMax: t.float({ required: false }),
    search: t.string({ required: false }),
  }),
});

// Tipo extendido para cartera con información calculada
export const CarteraItem = builder.objectRef<{
  prestamo: any;
  diasAtraso: number;
  saldoPendiente: number;
  cuotaVencida: any | null;
  nivelRiesgo: string;
}>("CarteraItem");

CarteraItem.implement({
  fields: (t) => ({
    prestamo: t.field({
      type: Prestamo,
      resolve: (parent) => parent.prestamo,
    }),
    diasAtraso: t.exposeInt("diasAtraso"),
    saldoPendiente: t.exposeFloat("saldoPendiente"),
    cuotaVencida: t.field({
      type: Cuota,
      nullable: true,
      resolve: (parent) => parent.cuotaVencida,
    }),
    nivelRiesgo: t.exposeString("nivelRiesgo"),
  }),
});

export const CarteraPage = builder.objectRef<{
  items: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("CarteraPage");

CarteraPage.implement({
  fields: (t) => ({
    items: t.field({
      type: [CarteraItem],
      resolve: (parent) => parent.items,
    }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});

// ======================================================
// TIPOS Y FILTROS PARA LIQUIDACIÓN DE TERCEROS
// ======================================================

// Tipo para comisiones generadas (requerido para la relación en LiquidacionTercero)
export const ComisionGenerada = builder.prismaObject("tbl_comision_generada" as any, {
  fields: (t) => ({
    idcomision: t.exposeInt("idcomision"),
    idempresa: t.exposeInt("idempresa"),
    idprestamo: t.exposeInt("idprestamo"),
    idpago: t.exposeInt("idpago", { nullable: true }),
    idliquidacion: t.exposeInt("idliquidacion", { nullable: true }),
    fechaGeneracion: t.field({
      type: "DateTime",
      resolve: (parent) => parent.fechaGeneracion,
    }),
    montoBase: t.float({
      resolve: (parent) => decimalToNumber(parent.montoBase),
    }),
    montoComision: t.float({
      resolve: (parent) => decimalToNumber(parent.montoComision),
    }),
    descripcion: t.exposeString("descripcion", { nullable: true }),
    liquidada: t.exposeBoolean("liquidada"),
    createdAt: t.field({
      type: "DateTime",
      resolve: (parent) => parent.createdAt,
    }),
    updatedAt: t.field({
      type: "DateTime",
      resolve: (parent) => parent.updatedAt,
    }),
    empresa: t.relation("empresa"),
    prestamo: t.relation("prestamo"),
    pago: t.relation("pago", { nullable: true }),
    liquidacion: t.relation("liquidacion", { nullable: true }),
  }),
});

export const LiquidacionTercero = builder.prismaObject("tbl_liquidacion_tercero" as any, {
  fields: (t) => ({
    idliquidacion: t.exposeInt("idliquidacion"),
    idempresa: t.exposeInt("idempresa"),
    idusuarioCreador: t.exposeInt("idusuarioCreador", { nullable: true }),
    idusuarioAutorizador: t.exposeInt("idusuarioAutorizador", { nullable: true }),
    codigo: t.exposeString("codigo"),
    periodoDesde: t.field({
      type: "DateTime",
      resolve: (parent) => parent.periodoDesde,
    }),
    periodoHasta: t.field({
      type: "DateTime",
      resolve: (parent) => parent.periodoHasta,
    }),
    estado: t.field({
      type: GQLEstadoLiquidacion,
      resolve: (parent) => parent.estado,
    }),
    montoTotalComisiones: t.float({
      resolve: (parent) => decimalToNumber(parent.montoTotalComisiones),
    }),
    montoTotalLiquidado: t.float({
      nullable: true,
      resolve: (parent) => decimalToNullableNumber(parent.montoTotalLiquidado),
    }),
    montoTotalPagado: t.float({
      nullable: true,
      resolve: (parent) => decimalToNullableNumber(parent.montoTotalPagado),
    }),
    fechaLiquidacion: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent) => parent.fechaLiquidacion,
    }),
    fechaPago: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent) => parent.fechaPago,
    }),
    numeroComisiones: t.exposeInt("numeroComisiones"),
    observaciones: t.exposeString("observaciones", { nullable: true }),
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
    empresa: t.relation("empresa"),
    usuarioCreador: t.relation("usuarioCreador", { nullable: true }),
    usuarioAutorizador: t.relation("usuarioAutorizador", { nullable: true }),
    comisiones: t.relation("comisiones"),
  }),
});

export const CreateLiquidacionTerceroInputSchema = z.object({
  idempresa: z.number().int().positive(),
  idusuarioCreador: z.number().int().positive().optional(),
  idusuarioAutorizador: z.number().int().positive().optional(),
  codigo: z.string().min(1),
  periodoDesde: dateInput.transform((d) => d ?? new Date()),
  periodoHasta: dateInput.transform((d) => d ?? new Date()),
  observaciones: z.string().optional(),
});

export const CreateLiquidacionTerceroInput = builder.inputRef("CreateLiquidacionTerceroInput").implement({
  fields: (t) => ({
    idempresa: t.int({ required: true }),
    idusuarioCreador: t.int({ required: false }),
    idusuarioAutorizador: t.int({ required: false }),
    codigo: t.string({ required: true }),
    periodoDesde: t.field({ type: "DateTime", required: true }),
    periodoHasta: t.field({ type: "DateTime", required: true }),
    observaciones: t.string({ required: false }),
  }),
});

export const UpdateLiquidacionTerceroInputSchema = z.object({
  idliquidacion: z.number().int().positive(),
  idusuarioAutorizador: z.number().int().positive().optional(),
  estado: z.nativeEnum(EstadoLiquidacionEnum).optional(),
  montoTotalLiquidado: z.number().nonnegative().optional(),
  montoTotalPagado: z.number().nonnegative().optional(),
  fechaLiquidacion: dateInput,
  fechaPago: dateInput,
  observaciones: z.string().optional(),
});

export const UpdateLiquidacionTerceroInput = builder.inputRef("UpdateLiquidacionTerceroInput").implement({
  fields: (t) => ({
    idliquidacion: t.int({ required: true }),
    idusuarioAutorizador: t.int({ required: false }),
    estado: t.field({ type: GQLEstadoLiquidacion, required: false }),
    montoTotalLiquidado: t.float({ required: false }),
    montoTotalPagado: t.float({ required: false }),
    fechaLiquidacion: t.field({ type: "DateTime", required: false }),
    fechaPago: t.field({ type: "DateTime", required: false }),
    observaciones: t.string({ required: false }),
  }),
});

export const LiquidacionTerceroFiltersInput = builder.inputRef("LiquidacionTerceroFiltersInput").implement({
  fields: (t) => ({
    page: t.int({ required: false }),
    pageSize: t.int({ required: false }),
    idempresa: t.int({ required: false }),
    estado: t.field({ type: GQLEstadoLiquidacion, required: false }),
    periodoDesde: t.field({ type: "DateTime", required: false }),
    periodoHasta: t.field({ type: "DateTime", required: false }),
    fechaLiquidacionDesde: t.field({ type: "DateTime", required: false }),
    fechaLiquidacionHasta: t.field({ type: "DateTime", required: false }),
  }),
});

export const LiquidacionTerceroPage = builder.objectRef<{
  liquidaciones: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("LiquidacionTerceroPage");

LiquidacionTerceroPage.implement({
  fields: (t) => ({
    liquidaciones: t.field({
      type: [LiquidacionTercero],
      resolve: (parent) => parent.liquidaciones,
    }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});

// ======================================================
// TIPOS PARA RESUMEN Y DETALLE DE LIQUIDACIONES
// ======================================================

export const ComisionDetalle = builder.objectRef<{
  idcomision: number;
  codigoPrestamo: string;
  cliente: string;
  documentoCliente: string;
  fechaGeneracion: Date;
  montoBase: number;
  montoComision: number;
  descripcion: string | null;
  fechaPago: Date | null;
  montoPago: number | null;
  idpago: number | null;
}>("ComisionDetalle");

ComisionDetalle.implement({
  fields: (t) => ({
    idcomision: t.exposeInt("idcomision"),
    codigoPrestamo: t.exposeString("codigoPrestamo"),
    cliente: t.exposeString("cliente"),
    documentoCliente: t.exposeString("documentoCliente"),
    fechaGeneracion: t.field({
      type: "DateTime",
      resolve: (parent) => parent.fechaGeneracion,
    }),
    montoBase: t.exposeFloat("montoBase"),
    montoComision: t.exposeFloat("montoComision"),
    descripcion: t.exposeString("descripcion", { nullable: true }),
    fechaPago: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (parent) => parent.fechaPago,
    }),
    montoPago: t.exposeFloat("montoPago", { nullable: true }),
    idpago: t.exposeInt("idpago", { nullable: true }),
  }),
});

export const ResumenLiquidacionTercero = builder.objectRef<{
  idempresa: number;
  empresa: any;
  periodoDesde: Date;
  periodoHasta: Date;
  totalLiquidaciones: number;
  montoTotalComisiones: number;
  montoTotalLiquidado: number;
  montoTotalPagado: number;
  liquidacionesPendientes: number;
  liquidacionesLiquidadas: number;
  liquidacionesPagadas: number;
  liquidaciones: any[];
}>("ResumenLiquidacionTercero");

// Tipo para empresa tercera
export const EmpresaTercera = builder.prismaObject("tbl_empresa_tercera" as any, {
  fields: (t) => ({
    idempresa: t.exposeInt("idempresa"),
    codigo: t.exposeString("codigo"),
    nombre: t.exposeString("nombre"),
    ruc: t.exposeString("ruc", { nullable: true }),
    contacto: t.exposeString("contacto", { nullable: true }),
    email: t.exposeString("email", { nullable: true }),
    telefono: t.exposeString("telefono", { nullable: true }),
    direccion: t.exposeString("direccion", { nullable: true }),
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

ResumenLiquidacionTercero.implement({
  fields: (t) => ({
    idempresa: t.exposeInt("idempresa"),
    empresa: t.field({
      type: EmpresaTercera,
      resolve: (parent) => parent.empresa,
    }),
    periodoDesde: t.field({
      type: "DateTime",
      resolve: (parent) => parent.periodoDesde,
    }),
    periodoHasta: t.field({
      type: "DateTime",
      resolve: (parent) => parent.periodoHasta,
    }),
    totalLiquidaciones: t.exposeInt("totalLiquidaciones"),
    montoTotalComisiones: t.exposeFloat("montoTotalComisiones"),
    montoTotalLiquidado: t.exposeFloat("montoTotalLiquidado"),
    montoTotalPagado: t.exposeFloat("montoTotalPagado"),
    liquidacionesPendientes: t.exposeInt("liquidacionesPendientes"),
    liquidacionesLiquidadas: t.exposeInt("liquidacionesLiquidadas"),
    liquidacionesPagadas: t.exposeInt("liquidacionesPagadas"),
    liquidaciones: t.field({
      type: [LiquidacionTercero],
      resolve: (parent) => parent.liquidaciones,
    }),
  }),
});

export const DetallePagoLiquidacion = builder.objectRef<{
  idpago: number;
  idprestamo: number;
  codigoPrestamo: string;
  cliente: string;
  documentoCliente: string;
  fechaPago: Date;
  montoTotal: number;
  montoCapital: number;
  montoInteres: number;
  montoMora: number;
  metodoPago: string;
  comisiones: any[];
}>("DetallePagoLiquidacion");

DetallePagoLiquidacion.implement({
  fields: (t) => ({
    idpago: t.exposeInt("idpago"),
    idprestamo: t.exposeInt("idprestamo"),
    codigoPrestamo: t.exposeString("codigoPrestamo"),
    cliente: t.exposeString("cliente"),
    documentoCliente: t.exposeString("documentoCliente"),
    fechaPago: t.field({
      type: "DateTime",
      resolve: (parent) => parent.fechaPago,
    }),
    montoTotal: t.exposeFloat("montoTotal"),
    montoCapital: t.exposeFloat("montoCapital"),
    montoInteres: t.exposeFloat("montoInteres"),
    montoMora: t.exposeFloat("montoMora"),
    metodoPago: t.exposeString("metodoPago"),
    comisiones: t.field({
      type: [ComisionDetalle],
      resolve: (parent) => parent.comisiones,
    }),
  }),
});

// ======================================================
// TIPOS Y FILTROS PARA DOCUMENTOS
// ======================================================

export const Documento = builder.prismaObject("tbl_documento" as any, {
  fields: (t) => ({
    iddocumento: t.exposeInt("iddocumento"),
    idprestamo: t.exposeInt("idprestamo"),
    idusuario: t.exposeInt("idusuario", { nullable: true }),
    tipo: t.field({
      type: GQLTipoDocumento,
      resolve: (parent) => parent.tipo,
    }),
    nombre: t.exposeString("nombre"),
    nombreArchivo: t.exposeString("nombreArchivo"),
    rutaArchivo: t.exposeString("rutaArchivo"),
    mimeType: t.exposeString("mimeType", { nullable: true }),
    tamano: t.exposeInt("tamano", { nullable: true }),
    version: t.exposeInt("version"),
    esVersionActual: t.exposeBoolean("esVersionActual"),
    observaciones: t.exposeString("observaciones", { nullable: true }),
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
  }),
});

export const CreateDocumentoInputSchema = z.object({
  idprestamo: z.number().int().positive(),
  idusuario: z.number().int().positive().optional(),
  tipo: z.nativeEnum(TipoDocumentoEnum),
  nombre: z.string().min(1),
  nombreArchivo: z.string().min(1),
  rutaArchivo: z.string().min(1),
  mimeType: z.string().optional(),
  tamano: z.number().int().nonnegative().optional(),
  observaciones: z.string().optional(),
});

export const CreateDocumentoInput = builder.inputRef("CreateDocumentoInput").implement({
  fields: (t) => ({
    idprestamo: t.int({ required: true }),
    idusuario: t.int({ required: false }),
    tipo: t.field({ type: GQLTipoDocumento, required: true }),
    nombre: t.string({ required: true }),
    nombreArchivo: t.string({ required: true }),
    rutaArchivo: t.string({ required: true }),
    mimeType: t.string({ required: false }),
    tamano: t.int({ required: false }),
    observaciones: t.string({ required: false }),
  }),
});

export const DocumentoFiltersInput = builder.inputRef("DocumentoFiltersInput").implement({
  fields: (t) => ({
    idprestamo: t.int({ required: false }),
    tipo: t.field({ type: GQLTipoDocumento, required: false }),
    esVersionActual: t.boolean({ required: false }),
    idusuario: t.int({ required: false }),
  }),
});

// ======================================================
// TIPOS PARA CONFIGURACIÓN DEL SISTEMA
// ======================================================

export const ConfiguracionSistema = builder.prismaObject("tbl_configuracion_sistema" as any, {
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
    usuarioMod: t.relation("usuarioMod", { nullable: true }),
  }),
});

export const UpdateConfiguracionInputSchema = z.object({
  clave: z.string().min(1),
  valor: z.string().min(1),
  idusuarioMod: z.number().int().positive().optional(),
});

export const UpdateConfiguracionInput = builder.inputRef("UpdateConfiguracionInput").implement({
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

export const BulkUpdateConfiguracionInput = builder.inputRef("BulkUpdateConfiguracionInput").implement({
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

// ======================================================
// TIPOS PARA REPORTES Y KPIs
// ======================================================

export const ReporteFiltersInput = builder.inputRef("ReporteFiltersInput").implement({
  fields: (t) => ({
    fechaDesde: t.field({ type: "DateTime", required: false }),
    fechaHasta: t.field({ type: "DateTime", required: false }),
    idempresa: t.int({ required: false }),
    idusuarioGestor: t.int({ required: false }),
    tipoprestamo: t.field({ type: GQLTipoPrestamo, required: false }),
  }),
});

// Aging de cartera por rangos de días
export const AgingCarteraItem = builder.objectRef<{
  rango: string;
  diasMin: number;
  diasMax: number;
  cantidad: number;
  monto: number;
  porcentaje: number;
}>("AgingCarteraItem");

AgingCarteraItem.implement({
  fields: (t) => ({
    rango: t.exposeString("rango"),
    diasMin: t.exposeInt("diasMin"),
    diasMax: t.exposeInt("diasMax"),
    cantidad: t.exposeInt("cantidad"),
    monto: t.exposeFloat("monto"),
    porcentaje: t.exposeFloat("porcentaje"),
  }),
});

export const AgingCartera = builder.objectRef<{
  items: any[];
  total: number;
  montoTotal: number;
}>("AgingCartera");

AgingCartera.implement({
  fields: (t) => ({
    items: t.field({
      type: [AgingCarteraItem],
      resolve: (parent) => parent.items,
    }),
    total: t.exposeInt("total"),
    montoTotal: t.exposeFloat("montoTotal"),
  }),
});

// Recuperación real vs esperada
export const RecuperacionItem = builder.objectRef<{
  periodo: string;
  montoEsperado: number;
  montoReal: number;
  porcentajeRecuperacion: number;
  diferencia: number;
}>("RecuperacionItem");

RecuperacionItem.implement({
  fields: (t) => ({
    periodo: t.exposeString("periodo"),
    montoEsperado: t.exposeFloat("montoEsperado"),
    montoReal: t.exposeFloat("montoReal"),
    porcentajeRecuperacion: t.exposeFloat("porcentajeRecuperacion"),
    diferencia: t.exposeFloat("diferencia"),
  }),
});

export const RecuperacionRealVsEsperada = builder.objectRef<{
  items: any[];
  montoTotalEsperado: number;
  montoTotalReal: number;
  porcentajeTotalRecuperacion: number;
}>("RecuperacionRealVsEsperada");

RecuperacionRealVsEsperada.implement({
  fields: (t) => ({
    items: t.field({
      type: [RecuperacionItem],
      resolve: (parent) => parent.items,
    }),
    montoTotalEsperado: t.exposeFloat("montoTotalEsperado"),
    montoTotalReal: t.exposeFloat("montoTotalReal"),
    porcentajeTotalRecuperacion: t.exposeFloat("porcentajeTotalRecuperacion"),
  }),
});

// Ranking de gestores
export const RankingGestorItem = builder.objectRef<{
  idusuario: number;
  nombre: string;
  email: string;
  cantidadPrestamos: number;
  montoTotal: number;
  montoRecuperado: number;
  porcentajeRecuperacion: number;
  moraPromedio: number;
  posicion: number;
}>("RankingGestorItem");

RankingGestorItem.implement({
  fields: (t) => ({
    idusuario: t.exposeInt("idusuario"),
    nombre: t.exposeString("nombre"),
    email: t.exposeString("email"),
    cantidadPrestamos: t.exposeInt("cantidadPrestamos"),
    montoTotal: t.exposeFloat("montoTotal"),
    montoRecuperado: t.exposeFloat("montoRecuperado"),
    porcentajeRecuperacion: t.exposeFloat("porcentajeRecuperacion"),
    moraPromedio: t.exposeFloat("moraPromedio"),
    posicion: t.exposeInt("posicion"),
  }),
});

export const RankingGestores = builder.objectRef<{
  items: any[];
  periodo: string;
}>("RankingGestores");

RankingGestores.implement({
  fields: (t) => ({
    items: t.field({
      type: [RankingGestorItem],
      resolve: (parent) => parent.items,
    }),
    periodo: t.exposeString("periodo"),
  }),
});

// Mora promedio
export const MoraPromedioItem = builder.objectRef<{
  periodo: string;
  moraPromedio: number;
  cantidadPrestamos: number;
  montoTotalMora: number;
}>("MoraPromedioItem");

MoraPromedioItem.implement({
  fields: (t) => ({
    periodo: t.exposeString("periodo"),
    moraPromedio: t.exposeFloat("moraPromedio"),
    cantidadPrestamos: t.exposeInt("cantidadPrestamos"),
    montoTotalMora: t.exposeFloat("montoTotalMora"),
  }),
});

export const MoraPromedio = builder.objectRef<{
  items: any[];
  moraPromedioGeneral: number;
}>("MoraPromedio");

MoraPromedio.implement({
  fields: (t) => ({
    items: t.field({
      type: [MoraPromedioItem],
      resolve: (parent) => parent.items,
    }),
    moraPromedioGeneral: t.exposeFloat("moraPromedioGeneral"),
  }),
});

// ======================================================
// TIPOS PARA DASHBOARD AVANZADO
// ======================================================

export const DashboardKPIs = builder.objectRef<{
  totalPrestado: number;
  totalRecuperado: number;
  carteraActiva: number;
  carteraVencida: number;
  moraPromedio: number;
  promesasVencidasHoy: number;
  prestamosUltimos30Dias: number;
}>("DashboardKPIs");

DashboardKPIs.implement({
  fields: (t) => ({
    totalPrestado: t.exposeFloat("totalPrestado"),
    totalRecuperado: t.exposeFloat("totalRecuperado"),
    carteraActiva: t.exposeFloat("carteraActiva"),
    carteraVencida: t.exposeFloat("carteraVencida"),
    moraPromedio: t.exposeFloat("moraPromedio"),
    promesasVencidasHoy: t.exposeInt("promesasVencidasHoy"),
    prestamosUltimos30Dias: t.exposeInt("prestamosUltimos30Dias"),
  }),
});

export const PrestamoEmitidoItem = builder.objectRef<{
  fecha: string;
  cantidad: number;
  montoTotal: number;
}>("PrestamoEmitidoItem");

PrestamoEmitidoItem.implement({
  fields: (t) => ({
    fecha: t.exposeString("fecha"),
    cantidad: t.exposeInt("cantidad"),
    montoTotal: t.exposeFloat("montoTotal"),
  }),
});

export const PrestamosUltimos30Dias = builder.objectRef<{
  total: number;
  montoTotal: number;
  items: any[];
}>("PrestamosUltimos30Dias");

PrestamosUltimos30Dias.implement({
  fields: (t) => ({
    total: t.exposeInt("total"),
    montoTotal: t.exposeFloat("montoTotal"),
    items: t.field({
      type: [PrestamoEmitidoItem],
      resolve: (parent) => parent.items,
    }),
  }),
});

export const PromesaVencida = builder.objectRef<{
  idpromesa: number;
  idprestamo: number;
  codigoPrestamo: string;
  cliente: string;
  fechaPromesa: Date;
  montoCompromiso: number;
  diasVencidos: number;
  gestor: string | null;
}>("PromesaVencida");

PromesaVencida.implement({
  fields: (t) => ({
    idpromesa: t.exposeInt("idpromesa"),
    idprestamo: t.exposeInt("idprestamo"),
    codigoPrestamo: t.exposeString("codigoPrestamo"),
    cliente: t.exposeString("cliente"),
    fechaPromesa: t.field({
      type: "DateTime",
      resolve: (parent) => parent.fechaPromesa,
    }),
    montoCompromiso: t.exposeFloat("montoCompromiso"),
    diasVencidos: t.exposeInt("diasVencidos"),
    gestor: t.exposeString("gestor", { nullable: true }),
  }),
});

export const PromesasVencidasHoy = builder.objectRef<{
  total: number;
  montoTotal: number;
  items: any[];
}>("PromesasVencidasHoy");

PromesasVencidasHoy.implement({
  fields: (t) => ({
    total: t.exposeInt("total"),
    montoTotal: t.exposeFloat("montoTotal"),
    items: t.field({
      type: [PromesaVencida],
      resolve: (parent) => parent.items,
    }),
  }),
});

// ======================================================
// TIPOS PARA CASTIGO DE CARTERA
// ======================================================

export const Castigo = builder.prismaObject("tbl_castigo" as any, {
  fields: (t) => ({
    idcastigo: t.exposeInt("idcastigo"),
    idprestamo: t.exposeInt("idprestamo"),
    motivo: t.exposeString("motivo"),
    observaciones: t.exposeString("observaciones", { nullable: true }),
    fechaCastigo: t.field({
      type: "DateTime",
      resolve: (parent) => parent.fechaCastigo,
    }),
    idusuario: t.exposeInt("idusuario", { nullable: true }),
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
  }),
});

export const CastigoCarteraResult = builder.objectRef<{
  prestamosCastigados: number;
  cuotasCanceladas: number;
}>("CastigoCarteraResult");

CastigoCarteraResult.implement({
  fields: (t) => ({
    prestamosCastigados: t.exposeInt("prestamosCastigados"),
    cuotasCanceladas: t.exposeInt("cuotasCanceladas"),
  }),
});

