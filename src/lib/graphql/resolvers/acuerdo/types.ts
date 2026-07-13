import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from "../../builder";
import { z } from "zod";
import { exposeDecimal } from "../../helpers/graphql-helpers";

const dispensasAcuerdoSchema = {
  dispensarInteresMoratorio: z.boolean().default(false),
  dispensarGestionCobranza: z.boolean().default(false),
};

export const SimularAcuerdoInputSchema = z.object({
  idprestamo: z.number().int().positive(),
  porcentajeDesc: z.number().min(0).max(100),
  numeroCuotas: z.number().int().min(1).default(1),
  ...dispensasAcuerdoSchema,
});

export const CreateAcuerdoInputSchema = SimularAcuerdoInputSchema.extend({
  idgestion: z.number().int().positive().optional(),
  fechaInicio: z.union([z.date(), z.string()]).transform((v) =>
    typeof v === "string" ? new Date(v) : v,
  ),
});

export const SimularAcuerdoInput = builder.inputRef("SimularAcuerdoInput").implement({
  fields: (t) => ({
    idprestamo: t.int({ required: true }),
    porcentajeDesc: t.float({ required: true }),
    numeroCuotas: t.int({ required: false, defaultValue: 1 }),
    dispensarInteresMoratorio: t.boolean({ required: false, defaultValue: false }),
    dispensarGestionCobranza: t.boolean({ required: false, defaultValue: false }),
  }),
});

export const CreateAcuerdoInput = builder.inputRef("CreateAcuerdoInput").implement({
  fields: (t) => ({
    idprestamo: t.int({ required: true }),
    porcentajeDesc: t.float({ required: true }),
    numeroCuotas: t.int({ required: false, defaultValue: 1 }),
    idgestion: t.int({ required: false }),
    fechaInicio: t.field({ type: "DateTime", required: true }),
    dispensarInteresMoratorio: t.boolean({ required: false, defaultValue: false }),
    dispensarGestionCobranza: t.boolean({ required: false, defaultValue: false }),
  }),
});

export const SimulacionAcuerdoResult = builder.objectRef<{
  baseNegociable: number;
  montoDescuento: number;
  montoAcordado: number;
  montoCuota: number;
  pagoMinimo: number;
  interesMoratorioExcluido: number;
  gestionCobranzaExcluida: number;
}>("SimulacionAcuerdoResult").implement({
  fields: (t) => ({
    baseNegociable: t.exposeFloat("baseNegociable"),
    montoDescuento: t.exposeFloat("montoDescuento"),
    montoAcordado: t.exposeFloat("montoAcordado"),
    montoCuota: t.exposeFloat("montoCuota"),
    pagoMinimo: t.exposeFloat("pagoMinimo"),
    interesMoratorioExcluido: t.exposeFloat("interesMoratorioExcluido"),
    gestionCobranzaExcluida: t.exposeFloat("gestionCobranzaExcluida"),
  }),
});

export const Acuerdo = definePrismaObject("tbl_acuerdo", {
  fields: (t) => ({
    idacuerdo: t.exposeInt("idacuerdo"),
    idmandante: t.exposeInt("idmandante"),
    idprestamo: t.exposeInt("idprestamo"),
    idgestion: t.exposeInt("idgestion", { nullable: true }),
    porcentajeDesc: exposeDecimal(t, "porcentajeDesc"),
    baseNegociable: exposeDecimal(t, "baseNegociable"),
    montoDescuento: exposeDecimal(t, "montoDescuento"),
    montoAcordado: exposeDecimal(t, "montoAcordado"),
    numeroCuotas: t.exposeInt("numeroCuotas"),
    montoCuota: exposeDecimal(t, "montoCuota"),
    pagoMinimo: exposeDecimal(t, "pagoMinimo"),
    dispensarInteresMoratorio: t.exposeBoolean("dispensarInteresMoratorio"),
    dispensarGestionCobranza: t.exposeBoolean("dispensarGestionCobranza"),
    fechaInicio: t.expose("fechaInicio", { type: "DateTime" }),
    estado: t.exposeString("estado"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    prestamo: t.relation("prestamo"),
    cuotas: t.relation('cuotas'),
  }),
});

export const AcuerdoCuota = definePrismaObject('tbl_acuerdo_cuota', {
  fields: (t) => ({
    idcuota: t.exposeInt('idcuota'),
    idacuerdo: t.exposeInt('idacuerdo'),
    numeroCuota: t.exposeInt('numeroCuota'),
    montoCuota: exposeDecimal(t, 'montoCuota'),
    fechaVencimiento: t.expose('fechaVencimiento', { type: 'DateTime' }),
    estado: t.exposeString('estado'),
    idpago: t.exposeInt('idpago', { nullable: true }),
  }),
});
