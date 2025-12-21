/**
 * Validador compartido para fechas
 * Transforma strings o Date objects a Date
 */

import { z } from "zod";

export const dateInput = z
  .union([z.date(), z.string()])
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    return typeof val === "string" ? new Date(val) : val;
  });

