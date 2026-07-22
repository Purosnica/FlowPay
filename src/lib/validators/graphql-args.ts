/**
 * Schemas Zod reutilizables para args GraphQL planos (I017).
 */

import { z } from 'zod';

export const IdPositiveSchema = z.number().int().positive({
  message: 'El id debe ser un entero positivo',
});

export const IdArgsSchema = z.object({
  id: IdPositiveSchema,
});

export const IdMandanteOptionalSchema = z
  .number()
  .int()
  .positive({ message: 'El idmandante debe ser un entero positivo' })
  .nullish()
  .transform((v) => v ?? undefined);

export const PaginationArgsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(20),
});

export const ActualizarConfigCobranzaSchema = z.object({
  pagoAutoAplicar: z.boolean().nullish(),
  maxContactosDia: z
    .number()
    .int()
    .min(0, 'maxContactosDia debe ser >= 0')
    .max(10_000, 'maxContactosDia no puede exceder 10000')
    .nullish(),
  acuerdoDiasGracia: z
    .number()
    .int()
    .min(0, 'acuerdoDiasGracia debe ser >= 0')
    .max(365, 'acuerdoDiasGracia no puede exceder 365')
    .nullish(),
  diasSinGestionAlerta: z
    .number()
    .int()
    .min(0, 'diasSinGestionAlerta debe ser >= 0')
    .max(365, 'diasSinGestionAlerta no puede exceder 365')
    .nullish(),
  diasMoraCastigo: z
    .number()
    .int()
    .min(1, 'diasMoraCastigo debe ser >= 1')
    .max(3650, 'diasMoraCastigo no puede exceder 3650')
    .nullish(),
  acuerdoDescuentoMaxSinAprobacion: z
    .number()
    .int()
    .min(0, 'acuerdoDescuentoMaxSinAprobacion debe ser >= 0')
    .max(100, 'acuerdoDescuentoMaxSinAprobacion no puede exceder 100')
    .nullish(),
  metaGestionesSemana: z
    .number()
    .int()
    .min(0, 'metaGestionesSemana debe ser >= 0')
    .max(100_000, 'metaGestionesSemana no puede exceder 100000')
    .nullish(),
  metaRecuperacionSemana: z
    .number()
    .int()
    .min(0, 'metaRecuperacionSemana debe ser >= 0')
    .max(1_000_000_000, 'metaRecuperacionSemana no puede exceder 1000000000')
    .nullish(),
  metaRecuperacionMes: z
    .number()
    .int()
    .min(0, 'metaRecuperacionMes debe ser >= 0')
    .max(1_000_000_000, 'metaRecuperacionMes no puede exceder 1000000000')
    .nullish(),
  bandejaCandidateLimit: z
    .number()
    .int()
    .min(1, 'bandejaCandidateLimit debe ser >= 1')
    .max(5_000, 'bandejaCandidateLimit no puede exceder 5000')
    .nullish(),
  miDiaCandidateLimit: z
    .number()
    .int()
    .min(1, 'miDiaCandidateLimit debe ser >= 1')
    .max(5_000, 'miDiaCandidateLimit no puede exceder 5000')
    .nullish(),
});

export const MarcarNotificacionesLeidasSchema = z.object({
  ids: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Cada id de notificación es obligatorio')
        .max(128, 'Cada id de notificación es demasiado largo'),
    )
    .min(1, 'Debe indicar al menos un id')
    .max(100, 'No puede marcar más de 100 notificaciones a la vez'),
});

export const IdMandanteArgsSchema = z.object({
  idmandante: IdMandanteOptionalSchema,
});

export const AsignarUsuarioMandanteArgsSchema = z.object({
  idusuario: IdPositiveSchema,
  idmandante: IdPositiveSchema,
});

export const MarcarPagoAplicadoSchema = z.object({
  idpago: IdPositiveSchema,
  aplicado: z.boolean({
    message: 'aplicado debe ser booleano',
  }),
});

export const ActualizarMetasMandanteSchema = z.object({
  idmandante: IdPositiveSchema,
  metaGestionesSemana: z
    .number()
    .int()
    .min(0, 'metaGestionesSemana debe ser >= 0')
    .max(100_000, 'metaGestionesSemana no puede exceder 100000')
    .nullish(),
  metaRecuperacionSemana: z
    .number()
    .min(0, 'metaRecuperacionSemana debe ser >= 0')
    .max(1_000_000_000, 'metaRecuperacionSemana no puede exceder 1000000000')
    .nullish(),
  metaRecuperacionMes: z
    .number()
    .min(0, 'metaRecuperacionMes debe ser >= 0')
    .max(1_000_000_000, 'metaRecuperacionMes no puede exceder 1000000000')
    .nullish(),
});

export const ActualizarMetasCobradorSchema = z.object({
  idgestor: IdPositiveSchema,
  metaGestionesSemana: z
    .number()
    .int()
    .min(0, 'metaGestionesSemana debe ser >= 0')
    .max(100_000, 'metaGestionesSemana no puede exceder 100000')
    .nullish(),
  metaRecuperacionSemana: z
    .number()
    .min(0, 'metaRecuperacionSemana debe ser >= 0')
    .max(1_000_000_000, 'metaRecuperacionSemana no puede exceder 1000000000')
    .nullish(),
});
