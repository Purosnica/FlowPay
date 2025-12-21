/**
 * Validador para crear préstamo
 */

import { z } from "zod";
import {
  EstadoPrestamoEnum,
  TipoPrestamoEnum,
} from "@prisma/client";
import { dateInput } from "../shared/date-input";
import { PRESTAMO_RULES } from "@/lib/constants";

export const createPrestamoSchema = z.object({
  idcliente: z.number().int().positive(),
  idusuarioCreador: z.number().int().positive().optional(),
  codigo: z.string().min(1, "El código es obligatorio"),
  referencia: z.string().optional(),
  tipoprestamo: z.nativeEnum(TipoPrestamoEnum),
  estado: z.nativeEnum(EstadoPrestamoEnum).optional(),
  montoSolicitado: z
    .number()
    .nonnegative()
    .min(PRESTAMO_RULES.MONTO_MINIMO, `El monto debe ser mayor o igual a ${PRESTAMO_RULES.MONTO_MINIMO}`)
    .max(PRESTAMO_RULES.MONTO_MAXIMO, `El monto no puede exceder ${PRESTAMO_RULES.MONTO_MAXIMO}`),
  montoAprobado: z.number().nonnegative().optional(),
  montoDesembolsado: z.number().nonnegative().optional(),
  comisionTercerizado: z.number().nonnegative().optional(),
  tasaInteresAnual: z
    .number()
    .nonnegative()
    .min(PRESTAMO_RULES.TASA_INTERES_MINIMA)
    .max(PRESTAMO_RULES.TASA_INTERES_MAXIMA)
    .optional(),
  plazoMeses: z
    .number()
    .int()
    .positive()
    .min(PRESTAMO_RULES.PLAZO_MINIMO_MESES)
    .max(PRESTAMO_RULES.PLAZO_MAXIMO_MESES)
    .optional(),
  fechaSolicitud: dateInput,
  fechaAprobacion: dateInput,
  fechaDesembolso: dateInput,
  fechaVencimiento: dateInput,
  observaciones: z.string().optional(),
});

export type CreatePrestamoInput = z.infer<typeof createPrestamoSchema>;

