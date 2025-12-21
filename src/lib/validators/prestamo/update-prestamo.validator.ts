/**
 * Validador para actualizar préstamo
 */

import { createPrestamoSchema } from "./create-prestamo.validator";
import { z } from "zod";

export const updatePrestamoSchema = createPrestamoSchema.partial().extend({
  idprestamo: z.number().int().positive(),
  idusuarioMod: z.number().int().positive().optional(),
});

export type UpdatePrestamoInput = z.infer<typeof updatePrestamoSchema>;

