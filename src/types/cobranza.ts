/**
 * TIPOS TYPESCRIPT PARA MÓDULO DE COBRANZA
 * 
 * Define todos los tipos TypeScript para pagos, gestiones, acuerdos y asignaciones
 */

import {
  MetodoPagoEnum,
  TipoCobroEnum,
  EstadoGestionCobroEnum,
  TipoGestionEnum,
  CanalCobranzaEnum,
  TipoAcuerdoEnum,
  EstadoAcuerdoEnum,
} from "@prisma/client";

// ======================================================
// PAGOS
// ======================================================

export interface Pago {
  idpago: number;
  idprestamo: number;
  idcuota?: number | null;
  idacuerdo?: number | null;
  idusuario?: number | null;
  metodoPago: MetodoPagoEnum;
  tipoCobro: TipoCobroEnum;
  fechaPago: Date | string;
  referencia?: string | null;
  montoCapital: number;
  montoInteres: number;
  montoMora: number;
  montoTotal: number;
  observacion?: string | null;
  notas?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  usuario?: {
    idusuario: number;
    nombre: string;
    email: string;
  } | null;
  prestamo?: {
    idprestamo: number;
    codigo: string;
    cliente?: {
      idcliente: number;
      primer_nombres: string;
      primer_apellido: string;
    } | null;
  } | null;
  cuota?: {
    idcuota: number;
    numero: number;
  } | null;
  acuerdo?: {
    idacuerdo: number;
    tipoAcuerdo: TipoAcuerdoEnum;
  } | null;
}

export interface PagoFiltersInput {
  page?: number;
  pageSize?: number;
  idprestamo?: number;
  idcuota?: number;
  idacuerdo?: number;
  idusuario?: number;
  metodoPago?: MetodoPagoEnum;
  tipoCobro?: TipoCobroEnum;
  fechaDesde?: Date | string;
  fechaHasta?: Date | string;
}

export interface PagoPage {
  pagos: {
    pagos: Pago[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreatePagoInput {
  idprestamo: number;
  idcuota?: number | null;
  idacuerdo?: number | null;
  idusuario?: number | null;
  montoCapital: number;
  montoInteres: number;
  montoMora: number;
  metodoPago: MetodoPagoEnum;
  tipoCobro?: TipoCobroEnum;
  fechaPago?: Date | string;
  referencia?: string | null;
  observacion?: string | null;
  notas?: string | null;
}

export interface UpdatePagoInput {
  idpago: number;
  montoCapital?: number;
  montoInteres?: number;
  montoMora?: number;
  metodoPago?: MetodoPagoEnum;
  tipoCobro?: TipoCobroEnum;
  fechaPago?: Date | string;
  referencia?: string | null;
  observacion?: string | null;
  notas?: string | null;
}

// ======================================================
// GESTIONES DE COBRANZA
// ======================================================

export interface GestionCobro {
  idgestion: number;
  idprestamo: number;
  idcuota?: number | null;
  idusuario?: number | null;
  idresultado?: number | null;
  tipoGestion: TipoGestionEnum;
  canal: CanalCobranzaEnum;
  estado: EstadoGestionCobroEnum;
  fechaGestion: Date | string;
  proximaAccion?: Date | string | null;
  duracionLlamada?: number | null;
  resumen?: string | null;
  notas?: string | null;
  evidenciaArchivo?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  usuario?: {
    idusuario: number;
    nombre: string;
    email: string;
  } | null;
  prestamo?: {
    idprestamo: number;
    codigo: string;
    cliente?: {
      idcliente: number;
      primer_nombres: string;
      primer_apellido: string;
    } | null;
  } | null;
  resultado?: {
    idresultado: number;
    descripcion: string;
  } | null;
}

export interface GestionCobroFiltersInput {
  page?: number;
  pageSize?: number;
  idprestamo?: number;
  idcuota?: number;
  idusuario?: number;
  tipoGestion?: TipoGestionEnum;
  canal?: CanalCobranzaEnum;
  estado?: EstadoGestionCobroEnum;
  fechaDesde?: Date | string;
  fechaHasta?: Date | string;
}

export interface GestionCobroPage {
  gestionesCobro: {
    gestiones: GestionCobro[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreateGestionCobroInput {
  idprestamo: number;
  idcuota?: number | null;
  idusuario?: number | null;
  idresultado?: number | null;
  tipoGestion: TipoGestionEnum;
  canal: CanalCobranzaEnum;
  fechaGestion?: Date | string;
  proximaAccion?: Date | string | null;
  duracionLlamada?: number | null;
  resumen?: string | null;
  notas?: string | null;
  evidenciaArchivo?: string | null;
}

export interface UpdateGestionCobroInput {
  idgestion: number;
  idresultado?: number | null;
  estado?: EstadoGestionCobroEnum;
  proximaAccion?: Date | string | null;
  resumen?: string | null;
  notas?: string | null;
}

export interface ResultadoGestion {
  idresultado: number;
  codigo: string;
  descripcion: string;
  estado: boolean;
}

// ======================================================
// ACUERDOS DE PAGO
// ======================================================

export interface Acuerdo {
  idacuerdo: number;
  idprestamo: number;
  idusuario?: number | null;
  tipoAcuerdo: TipoAcuerdoEnum;
  estado: EstadoAcuerdoEnum;
  montoAcordado: number;
  numeroCuotas: number;
  fechasPagoProgramadas?: string | null; // JSON string
  fechaInicio: Date | string;
  fechaFin: Date | string;
  observacion?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  usuario?: {
    idusuario: number;
    nombre: string;
    email: string;
  } | null;
  prestamo?: {
    idprestamo: number;
    codigo: string;
    cliente?: {
      idcliente: number;
      primer_nombres: string;
      primer_apellido: string;
    } | null;
  } | null;
}

export interface AcuerdoFiltersInput {
  page?: number;
  pageSize?: number;
  idprestamo?: number;
  idusuario?: number;
  tipoAcuerdo?: TipoAcuerdoEnum;
  estado?: EstadoAcuerdoEnum;
  fechaDesde?: Date | string;
  fechaHasta?: Date | string;
}

export interface AcuerdoPage {
  acuerdos: {
    acuerdos: Acuerdo[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreateAcuerdoInput {
  idprestamo: number;
  idusuario?: number | null;
  tipoAcuerdo: TipoAcuerdoEnum;
  montoAcordado: number;
  numeroCuotas: number;
  fechasPagoProgramadas?: string[] | null;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  observacion?: string | null;
}

export interface UpdateAcuerdoInput {
  idacuerdo: number;
  estado?: EstadoAcuerdoEnum;
  montoAcordado?: number;
  fechaFin?: Date | string;
  observacion?: string | null;
}

// ======================================================
// ASIGNACIONES DE CARTERA
// ======================================================

export interface AsignacionCartera {
  idasignacion: number;
  idprestamo: number;
  idusuario: number;
  idusuarioAsignador?: number | null;
  fechaAsignacion: Date | string;
  fechaFin?: Date | string | null;
  motivo?: string | null;
  activa: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  usuario?: {
    idusuario: number;
    nombre: string;
    email: string;
  } | null;
  prestamo?: {
    idprestamo: number;
    codigo: string;
    cliente?: {
      idcliente: number;
      primer_nombres: string;
      primer_apellido: string;
    } | null;
  } | null;
}

export interface AsignacionCarteraFiltersInput {
  page?: number;
  pageSize?: number;
  idprestamo?: number;
  idusuario?: number;
  activa?: boolean;
  fechaDesde?: Date | string;
  fechaHasta?: Date | string;
}

export interface AsignacionCarteraPage {
  asignacionesCartera: {
    asignaciones: AsignacionCartera[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreateAsignacionCarteraInput {
  idprestamo: number;
  idusuario: number;
  idusuarioAsignador?: number | null;
  motivo?: string | null;
}



