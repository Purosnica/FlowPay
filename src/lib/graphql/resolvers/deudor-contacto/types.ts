import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from '../../builder';
import { z } from 'zod';

export const CreateDeudorContactoInputSchema = z.object({
  idcliente: z.number().int().positive(),
  tipo: z.enum(['CELULAR', 'TELEFONO', 'EMAIL', 'WHATSAPP']),
  valor: z.string().min(1),
  fuente: z
    .enum(['PROPORCIONADO_DEUDOR', 'MANDANTE', 'TERCERO'])
    .default('PROPORCIONADO_DEUDOR'),
  autorizado: z.boolean().default(false),
  esTercero: z.boolean().default(false),
  noContactar: z.boolean().default(false),
});

export const UpdateDeudorContactoInputSchema = z.object({
  idcontacto: z.number().int().positive(),
  tipo: z.enum(['CELULAR', 'TELEFONO', 'EMAIL', 'WHATSAPP']).optional(),
  valor: z.string().min(1).optional(),
  autorizado: z.boolean().optional(),
  esTercero: z.boolean().optional(),
  noContactar: z.boolean().optional(),
  estado: z.boolean().optional(),
});

export const CreateDeudorContactoInput = builder
  .inputRef('CreateDeudorContactoInput')
  .implement({
    fields: (t) => ({
      idcliente: t.int({ required: true }),
      tipo: t.string({ required: true }),
      valor: t.string({ required: true }),
      fuente: t.string({ required: false }),
      autorizado: t.boolean({ required: false }),
      esTercero: t.boolean({ required: false }),
      noContactar: t.boolean({ required: false }),
    }),
  });

export const UpdateDeudorContactoInput = builder
  .inputRef('UpdateDeudorContactoInput')
  .implement({
    fields: (t) => ({
      idcontacto: t.int({ required: true }),
      tipo: t.string({ required: false }),
      valor: t.string({ required: false }),
      autorizado: t.boolean({ required: false }),
      esTercero: t.boolean({ required: false }),
      noContactar: t.boolean({ required: false }),
      estado: t.boolean({ required: false }),
    }),
  });

export const DeudorContacto = definePrismaObject(
  'tbl_deudor_contacto',
  {
    fields: (t) => ({
      idcontacto: t.exposeInt('idcontacto'),
      idcliente: t.exposeInt('idcliente'),
      tipo: t.exposeString('tipo'),
      valor: t.exposeString('valor'),
      fuente: t.exposeString('fuente'),
      autorizado: t.exposeBoolean('autorizado'),
      esTercero: t.exposeBoolean('esTercero'),
      noContactar: t.exposeBoolean('noContactar'),
      estado: t.exposeBoolean('estado'),
      createdAt: t.expose('createdAt', { type: 'DateTime' }),
    }),
  },
);
