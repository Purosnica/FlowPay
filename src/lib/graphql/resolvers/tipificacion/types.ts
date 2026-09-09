import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from '../../builder';
import { z } from 'zod';

export const CodigoAccion = definePrismaObject("tbl_codigo_accion", {
  fields: (t) => ({
    idcodaccion: t.exposeInt("idcodaccion"),
    codigo: t.exposeString("codigo"),
    descripcion: t.exposeString("descripcion"),
    esTercero: t.exposeBoolean("esTercero"),
    estado: t.exposeBoolean("estado"),
  }),
});

export const CodigoResultado = definePrismaObject("tbl_codigo_resultado", {
  fields: (t) => ({
    idcodresultado: t.exposeInt("idcodresultado"),
    codigo: t.exposeString("codigo"),
    descripcion: t.exposeString("descripcion"),
    grupo: t.exposeString("grupo"),
    tipoGestion: t.exposeString("tipoGestion"),
    estado: t.exposeBoolean("estado"),
  }),
});

const codigoSchema = z.string().trim().min(1, 'El código es requerido').max(32);
const descripcionSchema = z.string().trim().min(1, 'La descripción es requerida').max(255);

export const CreateCodigoAccionInputSchema = z.object({
  codigo: codigoSchema,
  descripcion: descripcionSchema,
  esTercero: z.boolean().default(false),
  estado: z.boolean().default(true),
});
export const UpdateCodigoAccionInputSchema = CreateCodigoAccionInputSchema.partial().extend({
  idcodaccion: z.number().int().positive(),
});
export const CreateCodigoResultadoInputSchema = z.object({
  codigo: codigoSchema,
  descripcion: descripcionSchema,
  grupo: z.string().trim().min(1, 'El grupo es requerido').max(80),
  tipoGestion: z.string().trim().min(1, 'El tipo de gestión es requerido').max(80),
  estado: z.boolean().default(true),
});
export const UpdateCodigoResultadoInputSchema = CreateCodigoResultadoInputSchema.partial().extend({
  idcodresultado: z.number().int().positive(),
});

export const CreateCodigoAccionInput = builder.inputRef('CreateCodigoAccionInput').implement({ fields: (t) => ({
  codigo: t.string({ required: true }), descripcion: t.string({ required: true }),
  esTercero: t.boolean({ required: false, defaultValue: false }), estado: t.boolean({ required: false, defaultValue: true }),
}) });
export const UpdateCodigoAccionInput = builder.inputRef('UpdateCodigoAccionInput').implement({ fields: (t) => ({
  idcodaccion: t.int({ required: true }), codigo: t.string(), descripcion: t.string(), esTercero: t.boolean(), estado: t.boolean(),
}) });
export const CreateCodigoResultadoInput = builder.inputRef('CreateCodigoResultadoInput').implement({ fields: (t) => ({
  codigo: t.string({ required: true }), descripcion: t.string({ required: true }), grupo: t.string({ required: true }), tipoGestion: t.string({ required: true }), estado: t.boolean({ required: false, defaultValue: true }),
}) });
export const UpdateCodigoResultadoInput = builder.inputRef('UpdateCodigoResultadoInput').implement({ fields: (t) => ({
  idcodresultado: t.int({ required: true }), codigo: t.string(), descripcion: t.string(), grupo: t.string(), tipoGestion: t.string(), estado: t.boolean(),
}) });
