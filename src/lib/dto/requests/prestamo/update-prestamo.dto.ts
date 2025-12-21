/**
 * DTO para actualizar préstamo
 */

import { CreatePrestamoDto } from "./create-prestamo.dto";
import { TipoPrestamoEnum, EstadoPrestamoEnum } from "@prisma/client";

export interface UpdatePrestamoDto extends Partial<CreatePrestamoDto> {
  idprestamo: number;
  idusuarioMod?: number | null;
}

