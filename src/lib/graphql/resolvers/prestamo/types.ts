import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from "../../builder";
import { z } from "zod";
import { exposeDecimal } from "../../helpers/graphql-helpers";
import type { tbl_prestamo } from "@prisma/client";

export const CreatePrestamoInputSchema = z.object({
  idmandante: z.number().int().positive(),
  idcampana: z.number().int().positive().optional(),
  idcliente: z.number().int().positive(),
  noPrestamo: z.string().min(1),
  codigoUnico: z.string().min(1),
  noCuenta: z.string().optional(),
  idtipocredito: z.number().int().positive().optional(),
  idmodelopago: z.number().int().positive().optional(),
  idruta: z.number().int().positive().optional(),
  idagencia: z.number().int().positive().optional(),
  idgestorAsignado: z.number().int().positive().optional(),
  plazoMeses: z.number().int().positive().optional(),
  fechaPrestamo: z.union([z.date(), z.string()]).optional().transform((v) =>
    v ? (typeof v === "string" ? new Date(v) : v) : undefined,
  ),
  fechaVencimiento: z.union([z.date(), z.string()]).optional().transform((v) =>
    v ? (typeof v === "string" ? new Date(v) : v) : undefined,
  ),
  estado: z.string().default("Vigente"),
  moneda: z.enum(["NIO", "USD"]).default("NIO"),
  tipoCambio: z.number().positive().optional(),
  saldoTotal: z.number().nonnegative().default(0),
  montoPrestamo: z.number().nonnegative().default(0),
  diasMora: z.number().int().nonnegative().default(0),
  interes: z.number().nonnegative().default(0),
  interesMoratorio: z.number().nonnegative().default(0),
  comisionCav: z.number().nonnegative().default(0),
  comisionInsitu: z.number().nonnegative().default(0),
  mantenimientoValor: z.number().nonnegative().default(0),
  gestionCobranza: z.number().nonnegative().default(0),
  seguroSvsd: z.number().nonnegative().default(0),
  cargosAdmin: z.number().nonnegative().default(0),
});

export const BandejaFiltersSchema = z.object({
  idmandante: z.number().int().positive().optional(),
  search: z.string().optional(),
  tramoMoraMin: z.number().int().min(0).optional(),
  tramoMoraMax: z.number().int().min(0).nullable().optional(),
  ordenarPor: z.enum(['prioridad', 'saldo_desc', 'saldo_asc']).optional(),
  soloPromesaVencida: z.boolean().optional(),
  soloAgendaHoy: z.boolean().optional(),
  soloSinGestion: z.boolean().optional(),
  prioridadMin: z.number().int().min(0).optional(),
});

export const BandejaFiltersInput = builder.inputRef('BandejaFiltersInput').implement({
  fields: (t) => ({
    idmandante: t.int({ required: false }),
    search: t.string({ required: false }),
    tramoMoraMin: t.int({ required: false }),
    tramoMoraMax: t.int({ required: false }),
    ordenarPor: t.string({ required: false }),
    soloPromesaVencida: t.boolean({ required: false }),
    soloAgendaHoy: t.boolean({ required: false }),
    soloSinGestion: t.boolean({ required: false }),
    prioridadMin: t.int({ required: false }),
  }),
});

export const TransicionEstadoInput = builder.inputRef('TransicionEstadoInput').implement({
  fields: (t) => ({
    idprestamo: t.int({ required: true }),
    estadoNuevo: t.string({ required: true }),
    motivo: t.string({ required: false }),
  }),
});

export const HistorialEstadoPrestamoType = builder.objectRef<{
  idhistorial: number;
  estadoAnterior: string | null;
  estadoNuevo: string;
  motivo: string | null;
  usuario: string | null;
  createdAt: Date;
}>('HistorialEstadoPrestamo').implement({
  fields: (t) => ({
    idhistorial: t.exposeInt('idhistorial'),
    estadoAnterior: t.exposeString('estadoAnterior', { nullable: true }),
    estadoNuevo: t.exposeString('estadoNuevo'),
    motivo: t.exposeString('motivo', { nullable: true }),
    usuario: t.exposeString('usuario', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

export const TimelinePrestamoEventoType = builder.objectRef<{
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  usuario: string | null;
  metadata: string | null;
  fecha: Date;
}>('TimelinePrestamoEvento').implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    tipo: t.exposeString('tipo'),
    titulo: t.exposeString('titulo'),
    descripcion: t.exposeString('descripcion'),
    usuario: t.exposeString('usuario', { nullable: true }),
    metadata: t.exposeString('metadata', { nullable: true }),
    fecha: t.expose('fecha', { type: 'DateTime' }),
  }),
});

export const PrestamoFiltersSchema = z.object({
  idmandante: z.number().int().positive().optional(),
  idcampana: z.number().int().positive().optional(),
  idcliente: z.number().int().positive().optional(),
  idgestorAsignado: z.number().int().positive().optional(),
  estado: z.string().optional(),
  search: z.string().optional(),
  sinAsignar: z.boolean().optional(),
});

export const CreatePrestamoInput = builder.inputRef("CreatePrestamoInput").implement({
  fields: (t) => ({
    idmandante: t.int({ required: true }),
    idcampana: t.int({ required: false }),
    idcliente: t.int({ required: true }),
    noPrestamo: t.string({ required: true }),
    codigoUnico: t.string({ required: true }),
    noCuenta: t.string({ required: false }),
    idtipocredito: t.int({ required: false }),
    idmodelopago: t.int({ required: false }),
    idruta: t.int({ required: false }),
    idagencia: t.int({ required: false }),
    idgestorAsignado: t.int({ required: false }),
    plazoMeses: t.int({ required: false }),
    fechaPrestamo: t.field({ type: "DateTime", required: false }),
    fechaVencimiento: t.field({ type: "DateTime", required: false }),
    estado: t.string({ required: false, defaultValue: "Vigente" }),
    moneda: t.string({ required: false, defaultValue: "NIO" }),
    tipoCambio: t.float({ required: false }),
    saldoTotal: t.float({ required: false, defaultValue: 0 }),
    montoPrestamo: t.float({ required: false, defaultValue: 0 }),
    diasMora: t.int({ required: false, defaultValue: 0 }),
    interes: t.float({ required: false, defaultValue: 0 }),
    interesMoratorio: t.float({ required: false, defaultValue: 0 }),
    comisionCav: t.float({ required: false, defaultValue: 0 }),
    comisionInsitu: t.float({ required: false, defaultValue: 0 }),
    mantenimientoValor: t.float({ required: false, defaultValue: 0 }),
    gestionCobranza: t.float({ required: false, defaultValue: 0 }),
    seguroSvsd: t.float({ required: false, defaultValue: 0 }),
    cargosAdmin: t.float({ required: false, defaultValue: 0 }),
  }),
});

export const PrestamoFiltersInput = builder.inputRef("PrestamoFiltersInput").implement({
  fields: (t) => ({
    idmandante: t.int({ required: false }),
    idcampana: t.int({ required: false }),
    idcliente: t.int({ required: false }),
    idgestorAsignado: t.int({ required: false }),
    estado: t.string({ required: false }),
    search: t.string({ required: false }),
    sinAsignar: t.boolean({ required: false }),
  }),
});

export const DesgloseSaldoPrestamoType = builder.objectRef<{
  montoPrestamo: number;
  interes: number;
  gestionCobranza: number;
  comisionCav: number;
  comisionInsitu: number;
  mantenimientoValor: number;
  seguroSvsd: number;
  cargosAdmin: number;
  devolucionSaldoFavor: number;
  descuentosArchivo: number;
  interesMoratorio: number;
  subtotalComponentes: number;
  totalPagosAplicados: number;
  saldoCalculado: number;
  saldoRegistrado: number;
  baseAcuerdo: number;
  descuentoAcuerdoVigente: number;
  diferencia: number;
  cuadra: boolean;
}>('DesgloseSaldoPrestamo').implement({
  fields: (t) => ({
    montoPrestamo: t.exposeFloat('montoPrestamo'),
    interes: t.exposeFloat('interes'),
    gestionCobranza: t.exposeFloat('gestionCobranza'),
    comisionCav: t.exposeFloat('comisionCav'),
    comisionInsitu: t.exposeFloat('comisionInsitu'),
    mantenimientoValor: t.exposeFloat('mantenimientoValor'),
    seguroSvsd: t.exposeFloat('seguroSvsd'),
    cargosAdmin: t.exposeFloat('cargosAdmin'),
    devolucionSaldoFavor: t.exposeFloat('devolucionSaldoFavor'),
    descuentosArchivo: t.exposeFloat('descuentosArchivo'),
    interesMoratorio: t.exposeFloat('interesMoratorio'),
    subtotalComponentes: t.exposeFloat('subtotalComponentes'),
    totalPagosAplicados: t.exposeFloat('totalPagosAplicados'),
    saldoCalculado: t.exposeFloat('saldoCalculado'),
    saldoRegistrado: t.exposeFloat('saldoRegistrado'),
    baseAcuerdo: t.exposeFloat('baseAcuerdo'),
    descuentoAcuerdoVigente: t.exposeFloat('descuentoAcuerdoVigente'),
    diferencia: t.exposeFloat('diferencia'),
    cuadra: t.exposeBoolean('cuadra'),
  }),
});

export const Prestamo = definePrismaObject("tbl_prestamo", {
  fields: (t) => ({
    idprestamo: t.exposeInt("idprestamo"),
    idmandante: t.exposeInt("idmandante"),
    idcampana: t.exposeInt("idcampana", { nullable: true }),
    idcliente: t.exposeInt("idcliente"),
    noPrestamo: t.exposeString("noPrestamo"),
    codigoUnico: t.exposeString("codigoUnico"),
    noCuenta: t.exposeString("noCuenta", { nullable: true }),
    estado: t.exposeString("estado"),
    moneda: t.exposeString("moneda"),
    diasMora: t.exposeInt("diasMora"),
    fechaPrestamo: t.expose("fechaPrestamo", { type: "DateTime", nullable: true }),
    fechaVencimiento: t.expose("fechaVencimiento", { type: "DateTime", nullable: true }),
    ultimaFechaPago: t.expose("ultimaFechaPago", { type: "DateTime", nullable: true }),
    reportableCentralRiesgo: t.exposeBoolean("reportableCentralRiesgo"),
    bloqueadoAsignacion: t.exposeBoolean("bloqueadoAsignacion"),
    saldoTotal: exposeDecimal(t, "saldoTotal"),
    montoPrestamo: exposeDecimal(t, "montoPrestamo"),
    interes: exposeDecimal(t, "interes"),
    interesMoratorio: exposeDecimal(t, "interesMoratorio"),
    comisionCav: exposeDecimal(t, "comisionCav"),
    comisionInsitu: exposeDecimal(t, "comisionInsitu"),
    mantenimientoValor: exposeDecimal(t, "mantenimientoValor"),
    gestionCobranza: exposeDecimal(t, "gestionCobranza"),
    seguroSvsd: exposeDecimal(t, "seguroSvsd"),
    cargosAdmin: exposeDecimal(t, "cargosAdmin"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    updatedAt: t.expose("updatedAt", { type: "DateTime" }),
    cliente: t.relation("cliente"),
    mandante: t.relation("mandante"),
    gestor: t.relation("gestor", { nullable: true }),
  }),
});

export const PrestamoPage = builder.objectRef<{
  prestamos: tbl_prestamo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("PrestamoPage").implement({
  fields: (t) => ({
    prestamos: t.field({ type: [Prestamo], resolve: (p) => p.prestamos }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});

export const BandejaPrestamo = builder.objectRef<{
  prestamo: Record<string, unknown>;
  scorePrioridad: number | null;
  motivoPrioridad: string | null;
}>('BandejaPrestamo').implement({
  fields: (t) => ({
    idprestamo: t.int({ resolve: (p) => p.prestamo.idprestamo as number }),
    idmandante: t.int({ resolve: (p) => p.prestamo.idmandante as number }),
    noPrestamo: t.string({ resolve: (p) => p.prestamo.noPrestamo as string }),
    codigoUnico: t.string({ resolve: (p) => p.prestamo.codigoUnico as string }),
    estado: t.string({ resolve: (p) => p.prestamo.estado as string }),
    moneda: t.string({ resolve: (p) => p.prestamo.moneda as string }),
    diasMora: t.int({ resolve: (p) => p.prestamo.diasMora as number }),
    saldoTotal: t.float({
      resolve: (p) => Number(p.prestamo.saldoTotal),
    }),
    scorePrioridad: t.float({
      nullable: true,
      resolve: (p) => p.scorePrioridad,
    }),
    motivoPrioridad: t.string({
      nullable: true,
      resolve: (p) => p.motivoPrioridad,
    }),
    cliente: t.field({
      type: 'JSON',
      nullable: true,
      resolve: (p) => p.prestamo.cliente ?? null,
    }),
    mandante: t.field({
      type: 'JSON',
      nullable: true,
      resolve: (p) => p.prestamo.mandante ?? null,
    }),
  }),
});

export const BandejaPrestamoPage = builder.objectRef<{
  prestamos: Array<{
    prestamo: Record<string, unknown>;
    scorePrioridad: number | null;
    motivoPrioridad: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>('BandejaPrestamoPage').implement({
  fields: (t) => ({
    prestamos: t.field({
      type: [BandejaPrestamo],
      resolve: (p) => p.prestamos,
    }),
    total: t.exposeInt('total'),
    page: t.exposeInt('page'),
    pageSize: t.exposeInt('pageSize'),
    totalPages: t.exposeInt('totalPages'),
  }),
});
