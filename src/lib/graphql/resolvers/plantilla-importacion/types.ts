import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from '../../builder';
import { z } from 'zod';
import type { MapeoColumnas } from '@/lib/cobranza/import/types';

const mapeoSchema = z.record(z.string(), z.string());

export const CreatePlantillaImportacionInputSchema = z.object({
  idmandante: z.number().int().positive(),
  nombre: z.string().min(1),
  mapeo: z.union([z.string(), z.record(z.string(), z.string())]).transform((v) => {
    if (typeof v === 'string') {
      const parsed = mapeoSchema.parse(JSON.parse(v));
      return JSON.stringify(parsed);
    }
    return JSON.stringify(mapeoSchema.parse(v));
  }),
  formatoFecha: z.string().optional(),
  estado: z.boolean().default(true),
});

export const UpdatePlantillaImportacionInputSchema =
  CreatePlantillaImportacionInputSchema.partial().extend({
    idplantillaImp: z.number().int().positive(),
  });

export const CreatePlantillaImportacionInput = builder
  .inputRef('CreatePlantillaImportacionInput')
  .implement({
    fields: (t) => ({
      idmandante: t.int({ required: true }),
      nombre: t.string({ required: true }),
      mapeo: t.string({ required: true }),
      formatoFecha: t.string({ required: false }),
      estado: t.boolean({ required: false, defaultValue: true }),
    }),
  });

export const UpdatePlantillaImportacionInput = builder
  .inputRef('UpdatePlantillaImportacionInput')
  .implement({
    fields: (t) => ({
      idplantillaImp: t.int({ required: true }),
      idmandante: t.int({ required: false }),
      nombre: t.string({ required: false }),
      mapeo: t.string({ required: false }),
      formatoFecha: t.string({ required: false }),
      estado: t.boolean({ required: false }),
    }),
  });

export const PlantillaImportacion = definePrismaObject(
  'tbl_plantilla_importacion',
  {
    fields: (t) => ({
      idplantillaImp: t.exposeInt('idplantillaImp'),
      idmandante: t.exposeInt('idmandante'),
      nombre: t.exposeString('nombre'),
      mapeo: t.exposeString('mapeo'),
      formatoFecha: t.exposeString('formatoFecha', { nullable: true }),
      estado: t.exposeBoolean('estado'),
      contratoId: t.exposeString('contratoId', { nullable: true }),
      version: t.exposeInt('version'),
      mapeoHash: t.exposeString('mapeoHash', { nullable: true }),
      createdAt: t.expose('createdAt', { type: 'DateTime' }),
      updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
      mandante: t.relation('mandante'),
    }),
  },
);

export function parseMapeoPlantilla(json: string): MapeoColumnas {
  return mapeoSchema.parse(JSON.parse(json)) as MapeoColumnas;
}
