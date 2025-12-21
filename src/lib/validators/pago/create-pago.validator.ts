/**
 * Validador para crear pago
 */

import { z } from "zod";
import {
  MetodoPagoEnum,
  TipoCobroEnum,
} from "@prisma/client";
import { dateInput } from "../shared/date-input";
import { PAGO_RULES } from "@/lib/constants";

export const createPagoSchema = z.object({
  idprestamo: z.number().int().positive(),
  idcuota: z.number().int().positive().optional(),
  idacuerdo: z.number().int().positive().optional(),
  idusuario: z.number().int().positive().optional(),
  metodoPago: z.nativeEnum(MetodoPagoEnum),
  tipoCobro: z.nativeEnum(TipoCobroEnum).optional(),
  fechaPago: dateInput,
  referencia: z.string().optional(),
  montoCapital: z.number().nonnegative().default(0),
  montoInteres: z.number().nonnegative().default(0),
  montoMora: z.number().nonnegative().default(0),
  montoTotal: z.number().nonnegative().optional(),
  observacion: z.string().optional(),
  notas: z.string().optional(),
});

export type CreatePagoInput = z.infer<typeof createPagoSchema>;

