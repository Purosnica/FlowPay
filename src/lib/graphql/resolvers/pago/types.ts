import { definePrismaObject } from '../../helpers/prisma-object';
import { builder } from '../../builder';
import { z } from 'zod';
import { exposeDecimal } from '../../helpers/graphql-helpers';

export const MEDIOS_PAGO = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'DEPOSITO',
  'CHEQUE',
  'TARJETA',
  'OTRO',
] as const;

export const CreatePagoInputSchema = z.object({
  idprestamo: z.number().int().positive(),
  idacuerdo: z.number().int().positive().optional(),
  idgestion: z.number().int().positive().optional(),
  fechaPago: z
    .union([z.date(), z.string()])
    .transform((v) => (typeof v === 'string' ? new Date(v) : v)),
  monto: z.number().positive(),
  moneda: z.enum(['NIO', 'USD']).default('NIO'),
  tipoCambio: z.number().positive().optional(),
  medio: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.enum(MEDIOS_PAGO))
    .optional(),
  idempotencyKey: z
    .string()
    .trim()
    .min(8)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'idempotencyKey inválida'),
});

export const CreatePagoInput = builder.inputRef('CreatePagoInput').implement({
  fields: (t) => ({
    idprestamo: t.int({ required: true }),
    idacuerdo: t.int({ required: false }),
    idgestion: t.int({ required: false }),
    fechaPago: t.field({ type: 'DateTime', required: true }),
    monto: t.float({ required: true }),
    moneda: t.string({ required: false, defaultValue: 'NIO' }),
    tipoCambio: t.float({ required: false }),
    medio: t.string({ required: false }),
    idempotencyKey: t.string({ required: true }),
  }),
});

export const Pago = definePrismaObject('tbl_pago', {
  fields: (t) => ({
    idpago: t.exposeInt('idpago'),
    idmandante: t.exposeInt('idmandante'),
    idprestamo: t.exposeInt('idprestamo'),
    idacuerdo: t.exposeInt('idacuerdo', { nullable: true }),
    idgestion: t.exposeInt('idgestion', { nullable: true }),
    idgestor: t.exposeInt('idgestor', { nullable: true }),
    fechaPago: t.expose('fechaPago', { type: 'DateTime' }),
    monto: exposeDecimal(t, 'monto'),
    moneda: t.exposeString('moneda'),
    medio: t.exposeString('medio', { nullable: true }),
    aplicado: t.exposeBoolean('aplicado'),
    folio: t.exposeString('folio', { nullable: true }),
    reciboUrl: t.exposeString('reciboUrl', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    prestamo: t.relation('prestamo'),
    mandante: t.relation('mandante'),
    gestor: t.relation('gestor', { nullable: true }),
    /** I111: nombre del gestor vía batch-loader (evita N+1 en listas). */
    gestorNombre: t.string({
      nullable: true,
      resolve: async (pago, _args, ctx) => {
        if (pago.idgestor == null) {
          return null;
        }
        const u = await ctx.loaders.usuario(pago.idgestor);
        return u?.nombre ?? null;
      },
    }),
  }),
});
