import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from '../../builder';
import { z } from 'zod';
import { exposeDecimal } from '../../helpers/graphql-helpers';

export const CreateComisionCobroInputSchema = z.object({
  idmandante: z.number().int().positive(),
  tramoMoraMin: z.number().int().min(0),
  tramoMoraMax: z.number().int().min(0).nullable().optional(),
  porcentaje: z.number().min(0).max(100),
  estado: z.boolean().default(true),
});

export const UpdateComisionCobroInputSchema = z.object({
  idcomision: z.number().int().positive(),
  tramoMoraMin: z.number().int().min(0).optional(),
  tramoMoraMax: z.number().int().min(0).nullable().optional(),
  porcentaje: z.number().min(0).max(100).optional(),
  estado: z.boolean().optional(),
});

export const CreateComisionCobroInput = builder
  .inputRef('CreateComisionCobroInput')
  .implement({
    fields: (t) => ({
      idmandante: t.int({ required: true }),
      tramoMoraMin: t.int({ required: true }),
      tramoMoraMax: t.int({ required: false }),
      porcentaje: t.float({ required: true }),
      estado: t.boolean({ required: false, defaultValue: true }),
    }),
  });

export const UpdateComisionCobroInput = builder
  .inputRef('UpdateComisionCobroInput')
  .implement({
    fields: (t) => ({
      idcomision: t.int({ required: true }),
      tramoMoraMin: t.int({ required: false }),
      tramoMoraMax: t.int({ required: false }),
      porcentaje: t.float({ required: false }),
      estado: t.boolean({ required: false }),
    }),
  });

export const ComisionCobro = definePrismaObject('tbl_comision_cobro', {
  fields: (t) => ({
    idcomision: t.exposeInt('idcomision'),
    idmandante: t.exposeInt('idmandante'),
    tramoMoraMin: t.exposeInt('tramoMoraMin'),
    tramoMoraMax: t.exposeInt('tramoMoraMax', { nullable: true }),
    porcentaje: exposeDecimal(t, 'porcentaje'),
    estado: t.exposeBoolean('estado'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});
