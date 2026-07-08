import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from '../../builder';
import { z } from 'zod';

export const CreateFiadorInputSchema = z.object({
  idprestamo: z.number().int().positive(),
  nombre: z.string().min(1),
  telefono: z.string().optional(),
  tipo: z.enum(['FIADOR', 'CODEUDOR', 'REFERENCIA', 'EMERGENCIA']).default('FIADOR'),
});

export const UpdateFiadorInputSchema = z.object({
  idfiador: z.number().int().positive(),
  nombre: z.string().min(1).optional(),
  telefono: z.string().optional(),
  tipo: z.enum(['FIADOR', 'CODEUDOR', 'REFERENCIA', 'EMERGENCIA']).optional(),
});

export const CreateFiadorInput = builder.inputRef('CreateFiadorInput').implement({
  fields: (t) => ({
    idprestamo: t.int({ required: true }),
    nombre: t.string({ required: true }),
    telefono: t.string({ required: false }),
    tipo: t.string({ required: false, defaultValue: 'FIADOR' }),
  }),
});

export const UpdateFiadorInput = builder.inputRef('UpdateFiadorInput').implement({
  fields: (t) => ({
    idfiador: t.int({ required: true }),
    nombre: t.string({ required: false }),
    telefono: t.string({ required: false }),
    tipo: t.string({ required: false }),
  }),
});

export const Fiador = definePrismaObject('tbl_fiador', {
  fields: (t) => ({
    idfiador: t.exposeInt('idfiador'),
    idprestamo: t.exposeInt('idprestamo'),
    nombre: t.exposeString('nombre'),
    telefono: t.exposeString('telefono', { nullable: true }),
    tipo: t.exposeString('tipo'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});
