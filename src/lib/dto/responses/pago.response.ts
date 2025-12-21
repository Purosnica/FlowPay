/**
 * DTO de respuesta para pago
 */

import { MetodoPagoEnum, TipoCobroEnum } from "@prisma/client";

export interface PagoResponse {
  idpago: number;
  idprestamo: number;
  idcuota?: number | null;
  idacuerdo?: number | null;
  idusuario?: number | null;
  metodoPago: MetodoPagoEnum;
  tipoCobro: TipoCobroEnum;
  fechaPago: Date;
  referencia?: string | null;
  montoCapital: number;
  montoInteres: number;
  montoMora: number;
  montoTotal: number;
  observacion?: string | null;
  notas?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relaciones opcionales
  prestamo?: {
    idprestamo: number;
    codigo: string;
  } | null;
  cuota?: {
    idcuota: number;
    numero: number;
  } | null;
}

