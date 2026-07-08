import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from '../../builder';
import { z } from 'zod';

export const CreateDocumentoInputSchema = z.object({
  idprestamo: z.number().int().positive().optional(),
  idcliente: z.number().int().positive().optional(),
  tipo: z.enum(['RECIBO', 'PODER', 'EVIDENCIA', 'GRABACION', 'CONTRATO']),
  url: z.string().url(),
});

export const CreateDocumentoInput = builder
  .inputRef('CreateDocumentoInput')
  .implement({
    fields: (t) => ({
      idprestamo: t.int({ required: false }),
      idcliente: t.int({ required: false }),
      tipo: t.string({ required: true }),
      url: t.string({ required: true }),
    }),
  });

export const Documento = definePrismaObject('tbl_documento', {
  fields: (t) => ({
    iddocumento: t.exposeInt('iddocumento'),
    idprestamo: t.exposeInt('idprestamo', { nullable: true }),
    idcliente: t.exposeInt('idcliente', { nullable: true }),
    tipo: t.exposeString('tipo'),
    url: t.exposeString('url'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});
