/**
 * Validador para actualizar pago
 */

import { createPagoSchema } from "./create-pago.validator";
import { z } from "zod";

export const updatePagoSchema = createPagoSchema.partial().extend({
  idpago: z.number().int().positive(),
});

export type UpdatePagoInput = z.infer<typeof updatePagoSchema>;

