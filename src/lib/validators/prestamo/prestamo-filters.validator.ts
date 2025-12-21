/**
 * Validador para filtros de préstamos
 */

import { z } from "zod";
import {
  EstadoPrestamoEnum,
  TipoPrestamoEnum,
} from "@prisma/client";

export const prestamoFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  idcliente: z.number().int().positive().optional(),
  estado: z.nativeEnum(EstadoPrestamoEnum).optional(),
  tipoprestamo: z.nativeEnum(TipoPrestamoEnum).optional(),
  search: z.string().optional(),
});

export type PrestamoFiltersInput = z.infer<typeof prestamoFiltersSchema>;

