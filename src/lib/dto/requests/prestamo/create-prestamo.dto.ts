/**
 * DTO para crear préstamo
 * 
 * Define la estructura de datos de entrada para crear un préstamo.
 * Separado de los tipos de dominio de Prisma.
 */

import { TipoPrestamoEnum, EstadoPrestamoEnum } from "@prisma/client";

export interface CreatePrestamoDto {
  idcliente: number;
  idusuarioCreador?: number | null;
  codigo: string;
  referencia?: string | null;
  tipoprestamo: TipoPrestamoEnum;
  estado?: EstadoPrestamoEnum;
  montoSolicitado: number;
  montoAprobado?: number | null;
  montoDesembolsado?: number | null;
  comisionTercerizado?: number | null;
  tasaInteresAnual?: number | null;
  plazoMeses?: number | null;
  fechaSolicitud?: Date;
  fechaAprobacion?: Date | null;
  fechaDesembolso?: Date | null;
  fechaVencimiento?: Date | null;
  observaciones?: string | null;
}

