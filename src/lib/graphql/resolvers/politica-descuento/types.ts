import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from '../../builder';
import { z } from 'zod';
import { exposeDecimal } from '../../helpers/graphql-helpers';

export const CreatePoliticaDescuentoInputSchema = z.object({
  idmandante: z.number().int().positive(),
  tramoMoraMin: z.number().int().min(0),
  tramoMoraMax: z.number().int().min(0).nullable().optional(),
  porcentaje: z.number().min(0).max(100),
  estado: z.boolean().default(true),
});

export const UpdatePoliticaDescuentoInputSchema = z.object({
  idpolitica: z.number().int().positive(),
  tramoMoraMin: z.number().int().min(0).optional(),
  tramoMoraMax: z.number().int().min(0).nullable().optional(),
  porcentaje: z.number().min(0).max(100).optional(),
  estado: z.boolean().optional(),
});

export const CreatePoliticaDescuentoInput = builder
  .inputRef('CreatePoliticaDescuentoInput')
  .implement({
    fields: (t) => ({
      idmandante: t.int({ required: true }),
      tramoMoraMin: t.int({ required: true }),
      tramoMoraMax: t.int({ required: false }),
      porcentaje: t.float({ required: true }),
      estado: t.boolean({ required: false, defaultValue: true }),
    }),
  });

export const UpdatePoliticaDescuentoInput = builder
  .inputRef('UpdatePoliticaDescuentoInput')
  .implement({
    fields: (t) => ({
      idpolitica: t.int({ required: true }),
      tramoMoraMin: t.int({ required: false }),
      tramoMoraMax: t.int({ required: false }),
      porcentaje: t.float({ required: false }),
      estado: t.boolean({ required: false }),
    }),
  });

export const PoliticaDescuento = definePrismaObject(
  'tbl_politica_descuento',
  {
    fields: (t) => ({
      idpolitica: t.exposeInt('idpolitica'),
      idmandante: t.exposeInt('idmandante'),
      tramoMoraMin: t.exposeInt('tramoMoraMin'),
      tramoMoraMax: t.exposeInt('tramoMoraMax', { nullable: true }),
      porcentaje: exposeDecimal(t, 'porcentaje'),
      estado: t.exposeBoolean('estado'),
      createdAt: t.expose('createdAt', { type: 'DateTime' }),
      updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    }),
  },
);
