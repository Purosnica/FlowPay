import { definePrismaObject } from '../../helpers/prisma-object';
import { builder, type GraphQLContext } from '../../builder';
import { z } from 'zod';
import { exposeDecimal } from '../../helpers/graphql-helpers';
import { resolverEstadoPago } from '@/lib/logic/pago-estado-logic';
import { MEDIOS_PAGO } from '@/lib/logic/pago-medios-logic';

export { MEDIOS_PAGO } from '@/lib/logic/pago-medios-logic';

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
  descripcion: z.preprocess((v) => {
    if (v === undefined || v === null) {
      return undefined;
    }
    if (typeof v !== 'string') {
      return v;
    }
    const trimmed = v.trim();
    return trimmed === '' ? undefined : trimmed;
  }, z.string().max(500, 'La descripción no puede superar 500 caracteres.').optional()),
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
    descripcion: t.string({ required: false }),
    idempotencyKey: t.string({ required: true }),
  }),
});

export const UpdatePagoInputSchema = z
  .object({
    idpago: z.number().int().positive(),
    fechaPago: z
      .union([z.date(), z.string()])
      .transform((v) => (typeof v === 'string' ? new Date(v) : v))
      .nullish()
      .transform((v) => v ?? undefined),
    monto: z.coerce.number().positive().nullish().transform((v) => v ?? undefined),
    moneda: z
      .enum(['NIO', 'USD'])
      .nullish()
      .transform((v) => v ?? undefined),
    tipoCambio: z
      .coerce.number()
      .positive()
      .nullish()
      .transform((v) => v ?? undefined),
    medio: z.preprocess((v) => {
      if (v === null || v === undefined || v === '') {
        return undefined;
      }
      if (typeof v !== 'string') {
        return v;
      }
      const normalized = v.trim().toUpperCase();
      return normalized === '' ? undefined : normalized;
    }, z.enum(MEDIOS_PAGO).optional()),
    descripcion: z.preprocess((v) => {
      if (v === undefined) {
        return undefined;
      }
      if (v === null) {
        return null;
      }
      if (typeof v !== 'string') {
        return v;
      }
      const trimmed = v.trim();
      return trimmed === '' ? null : trimmed;
    }, z.string().max(500).nullable().optional()),
  })
  .refine(
    (data) =>
      data.fechaPago !== undefined ||
      data.monto !== undefined ||
      data.moneda !== undefined ||
      data.tipoCambio !== undefined ||
      data.medio !== undefined ||
      data.descripcion !== undefined,
    { message: 'Debe indicar al menos un campo a actualizar.' },
  );

export type UpdatePagoInput = z.infer<typeof UpdatePagoInputSchema>;

export const UpdatePagoInput = builder.inputRef('UpdatePagoInput').implement({
  fields: (t) => ({
    idpago: t.int({ required: true }),
    fechaPago: t.field({ type: 'DateTime', required: false }),
    monto: t.float({ required: false }),
    moneda: t.string({ required: false }),
    tipoCambio: t.float({ required: false }),
    medio: t.string({ required: false }),
    descripcion: t.string({ required: false }),
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
    descripcion: t.exposeString('descripcion', { nullable: true }),
    aplicado: t.exposeBoolean('aplicado'),
    deletedAt: t.expose('deletedAt', { type: 'DateTime', nullable: true }),
    /** Estado operativo: PENDIENTE | CONCILIADO | ANULADO. */
    estado: t.string({
      resolve: (pago: {
        aplicado: boolean;
        deletedAt: Date | null;
      }) => resolverEstadoPago(pago),
    }),
    folio: t.exposeString('folio', { nullable: true }),
    reciboUrl: t.exposeString('reciboUrl', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    prestamo: t.relation('prestamo'),
    mandante: t.relation('mandante'),
    gestor: t.relation('gestor', { nullable: true }),
    /** I111: nombre del gestor vía batch-loader (evita N+1 en listas). */
    gestorNombre: t.string({
      nullable: true,
      resolve: async (
        pago: { idgestor: number | null },
        _args: Record<string, never>,
        ctx: GraphQLContext,
      ) => {
        if (pago.idgestor == null) {
          return null;
        }
        const u = await ctx.loaders.usuario(pago.idgestor);
        return u?.nombre ?? null;
      },
    }),
  }),
});
