/**
 * DTO de respuesta para préstamo
 * 
 * Define la estructura de datos de salida para préstamos.
 * Incluye relaciones necesarias para el frontend.
 */

import { EstadoPrestamoEnum, TipoPrestamoEnum } from "@prisma/client";

export interface PrestamoResponse {
  idprestamo: number;
  idcliente: number;
  idusuarioCreador?: number | null;
  idusuarioMod?: number | null;
  idusuarioGestor?: number | null;
  tipoprestamo: TipoPrestamoEnum;
  estado: EstadoPrestamoEnum;
  codigo: string;
  referencia?: string | null;
  montoSolicitado: number;
  montoAprobado?: number | null;
  montoDesembolsado?: number | null;
  comisionTercerizado?: number | null;
  tasaInteresAnual?: number | null;
  plazoMeses?: number | null;
  fechaSolicitud: Date;
  fechaAprobacion?: Date | null;
  fechaDesembolso?: Date | null;
  fechaVencimiento?: Date | null;
  fechaUltimoPago?: Date | null;
  observaciones?: string | null;
  saldoCapital?: number | null;
  saldoInteres?: number | null;
  saldoMora?: number | null;
  saldoTotal?: number | null;
  createdAt: Date;
  updatedAt: Date;
  // Relaciones opcionales
  cliente?: {
    idcliente: number;
    primer_nombres: string;
    primer_apellido: string;
    numerodocumento: string;
  } | null;
  cuotas?: Array<{
    idcuota: number;
    numero: number;
    estado: string;
    fechaVencimiento: Date;
    capitalProgramado: number;
    interesProgramado: number;
    moraProgramada: number;
    capitalPagado: number;
    interesPagado: number;
    moraPagada: number;
  }> | null;
}

