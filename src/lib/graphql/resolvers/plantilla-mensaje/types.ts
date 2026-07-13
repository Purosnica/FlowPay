import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from '../../builder';
import { z } from 'zod';

export const CreatePlantillaMensajeInputSchema = z.object({
  idmandante: z.number().int().positive(),
  nombre: z.string().min(1),
  canal: z.enum(['WHATSAPP', 'SMS', 'LLAMADA', 'CARTA', 'EMAIL']),
  etapa: z.string().optional(),
  contenido: z.string().min(1),
  estado: z.boolean().default(true),
});

export const UpdatePlantillaMensajeInputSchema = z.object({
  idplantilla: z.number().int().positive(),
  nombre: z.string().min(1).optional(),
  canal: z.enum(['WHATSAPP', 'SMS', 'LLAMADA', 'CARTA', 'EMAIL']).optional(),
  etapa: z.string().optional(),
  contenido: z.string().min(1).optional(),
  estado: z.boolean().optional(),
});

export const CreatePlantillaMensajeInput = builder
  .inputRef('CreatePlantillaMensajeInput')
  .implement({
    fields: (t) => ({
      idmandante: t.int({ required: true }),
      nombre: t.string({ required: true }),
      canal: t.string({ required: true }),
      etapa: t.string({ required: false }),
      contenido: t.string({ required: true }),
      estado: t.boolean({ required: false, defaultValue: true }),
    }),
  });

export const UpdatePlantillaMensajeInput = builder
  .inputRef('UpdatePlantillaMensajeInput')
  .implement({
    fields: (t) => ({
      idplantilla: t.int({ required: true }),
      nombre: t.string({ required: false }),
      canal: t.string({ required: false }),
      etapa: t.string({ required: false }),
      contenido: t.string({ required: false }),
      estado: t.boolean({ required: false }),
    }),
  });

export const PlantillaMensaje = definePrismaObject(
  'tbl_plantilla_mensaje',
  {
    fields: (t) => ({
      idplantilla: t.exposeInt('idplantilla'),
      idmandante: t.exposeInt('idmandante'),
      nombre: t.exposeString('nombre'),
      canal: t.exposeString('canal'),
      etapa: t.exposeString('etapa', { nullable: true }),
      contenido: t.exposeString('contenido'),
      estado: t.exposeBoolean('estado'),
      createdAt: t.expose('createdAt', { type: 'DateTime' }),
    }),
  },
);
