import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from '../../builder';
import { z } from 'zod';
import { exposeDecimal } from '../../helpers/graphql-helpers';
import type { tbl_agencia, tbl_ruta } from '@prisma/client';

export const CreateContratoMandanteInputSchema = z.object({
  idmandante: z.number().int().positive(),
  fechaInicio: z.union([z.date(), z.string()]).transform((v) =>
    typeof v === 'string' ? new Date(v) : v,
  ),
  fechaFin: z
    .union([z.date(), z.string()])
    .optional()
    .transform((v) => (v ? (typeof v === 'string' ? new Date(v) : v) : undefined)),
  permitePagoAnticipado: z.boolean().default(true),
  estado: z.boolean().default(true),
});

export const UpdateContratoMandanteInputSchema = z.object({
  idcontrato: z.number().int().positive(),
  fechaInicio: z
    .union([z.date(), z.string()])
    .optional()
    .transform((v) => (v ? (typeof v === 'string' ? new Date(v) : v) : undefined)),
  fechaFin: z
    .union([z.date(), z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined) {
        return v === null ? null : undefined;
      }
      return typeof v === 'string' ? new Date(v) : v;
    }),
  permitePagoAnticipado: z.boolean().optional(),
  estado: z.boolean().optional(),
});

export const CreateContratoMandanteInput = builder
  .inputRef('CreateContratoMandanteInput')
  .implement({
    fields: (t) => ({
      idmandante: t.int({ required: true }),
      fechaInicio: t.field({ type: 'DateTime', required: true }),
      fechaFin: t.field({ type: 'DateTime', required: false }),
      permitePagoAnticipado: t.boolean({ required: false }),
      estado: t.boolean({ required: false }),
    }),
  });

export const UpdateContratoMandanteInput = builder
  .inputRef('UpdateContratoMandanteInput')
  .implement({
    fields: (t) => ({
      idcontrato: t.int({ required: true }),
      fechaInicio: t.field({ type: 'DateTime', required: false }),
      fechaFin: t.field({ type: 'DateTime', required: false }),
      permitePagoAnticipado: t.boolean({ required: false }),
      estado: t.boolean({ required: false }),
    }),
  });

export const ContratoMandante = definePrismaObject(
  'tbl_contrato_mandante',
  {
    fields: (t) => ({
      idcontrato: t.exposeInt('idcontrato'),
      idmandante: t.exposeInt('idmandante'),
      fechaInicio: t.expose('fechaInicio', { type: 'DateTime' }),
      fechaFin: t.expose('fechaFin', { type: 'DateTime', nullable: true }),
      permitePagoAnticipado: t.exposeBoolean('permitePagoAnticipado'),
      estado: t.exposeBoolean('estado'),
      createdAt: t.expose('createdAt', { type: 'DateTime' }),
    }),
  },
);

export const PrestamoCorte = definePrismaObject('tbl_prestamo_corte', {
  fields: (t) => ({
    idcorte: t.exposeInt('idcorte'),
    idprestamo: t.exposeInt('idprestamo'),
    fechaCorte: t.expose('fechaCorte', { type: 'DateTime' }),
    saldoTotal: exposeDecimal(t, 'saldoTotal'),
    diasMora: t.exposeInt('diasMora'),
    estado: t.exposeString('estado'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

export const Agencia = definePrismaObject('tbl_agencia', {
  fields: (t) => ({
    idagencia: t.exposeInt('idagencia'),
    idmandante: t.exposeInt('idmandante'),
    codigo: t.exposeString('codigo'),
    nombre: t.exposeString('nombre'),
    estado: t.exposeBoolean('estado'),
  }),
});

export const Ruta = definePrismaObject('tbl_ruta', {
  fields: (t) => ({
    idruta: t.exposeInt('idruta'),
    idagencia: t.exposeInt('idagencia'),
    nombre: t.exposeString('nombre'),
    estado: t.exposeBoolean('estado'),
    agencia: t.relation('agencia'),
  }),
});

export const AgenciaPage = builder
  .objectRef<{
    agencias: tbl_agencia[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>('AgenciaPage')
  .implement({
    fields: (t) => ({
      agencias: t.field({
        type: [Agencia],
        resolve: (parent) => parent.agencias,
      }),
      total: t.exposeInt('total'),
      page: t.exposeInt('page'),
      pageSize: t.exposeInt('pageSize'),
      totalPages: t.exposeInt('totalPages'),
    }),
  });

export const RutaPage = builder
  .objectRef<{
    rutas: tbl_ruta[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>('RutaPage')
  .implement({
    fields: (t) => ({
      rutas: t.field({
        type: [Ruta],
        resolve: (parent) => parent.rutas,
      }),
      total: t.exposeInt('total'),
      page: t.exposeInt('page'),
      pageSize: t.exposeInt('pageSize'),
      totalPages: t.exposeInt('totalPages'),
    }),
  });

export const MandanteTipificacion = definePrismaObject(
  'tbl_mandante_tipificacion',
  {
    fields: (t) => ({
      idmt: t.exposeInt('idmt'),
      idmandante: t.exposeInt('idmandante'),
      idcodaccion: t.exposeInt('idcodaccion', { nullable: true }),
      idcodresultado: t.exposeInt('idcodresultado', { nullable: true }),
      activo: t.exposeBoolean('activo'),
      codaccion: t.relation('codaccion', { nullable: true }),
      codresult: t.relation('codresult', { nullable: true }),
    }),
  },
);

export const ValidacionHorarioType = builder
  .objectRef<{ permitido: boolean; motivo?: string }>('ValidacionHorario')
  .implement({
    fields: (t) => ({
      permitido: t.exposeBoolean('permitido'),
      motivo: t.exposeString('motivo', { nullable: true }),
    }),
  });

export const DashboardResumenType = builder
  .objectRef<{
    totalPrestamos: number;
    prestamosEnMora: number;
    saldoCartera: number;
    gestionesMes: number;
    pagosMes: number;
    pagosConciliadosMes: number;
    reclamosAbiertos: number;
    promesasVencidas: number;
  }>('DashboardResumenCobranza')
  .implement({
    fields: (t) => ({
      totalPrestamos: t.exposeInt('totalPrestamos'),
      prestamosEnMora: t.exposeInt('prestamosEnMora'),
      saldoCartera: t.exposeFloat('saldoCartera'),
      gestionesMes: t.exposeInt('gestionesMes'),
      pagosMes: t.exposeInt('pagosMes'),
      pagosConciliadosMes: t.exposeInt('pagosConciliadosMes'),
      reclamosAbiertos: t.exposeInt('reclamosAbiertos'),
      promesasVencidas: t.exposeInt('promesasVencidas'),
    }),
  });
