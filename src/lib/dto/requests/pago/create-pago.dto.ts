/**
 * DTO para crear pago
 */

import { MetodoPagoEnum, TipoCobroEnum } from "@prisma/client";

export interface CreatePagoDto {
  idprestamo: number;
  idcuota?: number | null;
  idacuerdo?: number | null;
  idusuario: number | null;
  montoCapital: number;
  montoInteres: number;
  montoMora: number;
  metodoPago: MetodoPagoEnum;
  tipoCobro?: TipoCobroEnum;
  fechaPago?: Date;
  referencia?: string | null;
  observacion?: string | null;
  notas?: string | null;
  // Para optimistic locking
  updatedAtPrestamo?: Date;
  ip?: string | null;
  userAgent?: string | null;
}

