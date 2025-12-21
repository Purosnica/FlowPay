/**
 * DTO de respuesta para cliente
 */

export interface ClienteResponse {
  idcliente: number;
  primer_nombres: string;
  segundo_nombres?: string | null;
  primer_apellido: string;
  segundo_apellido?: string | null;
  fechanacimiento?: Date | null;
  idtipodocumento: number;
  numerodocumento: string;
  fechavencimientodoc?: Date | null;
  idgenero?: number | null;
  idestadocivil?: number | null;
  idocupacion?: number | null;
  idtipopersona: number;
  idpais: number;
  iddepartamento?: number | null;
  direccion?: string | null;
  ciudad?: string | null;
  codigopostal?: string | null;
  telefono?: string | null;
  celular?: string | null;
  email?: string | null;
  sitioweb?: string | null;
  espep: boolean;
  observaciones?: string | null;
  estado: boolean;
  createdAt: Date;
  updatedAt: Date;
}

